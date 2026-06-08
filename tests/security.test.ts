import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { sensitiveDataProtection } from '../server/middleware/security';

// ============================================================
// Tests for sensitiveDataProtection middleware
// These validate that API keys are NOT redacted on API key
// management endpoints, but ARE redacted on other endpoints.
// ============================================================

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(sensitiveDataProtection);

  // Simulate API key settings endpoint (should NOT redact)
  app.get('/api/user/settings/api-key', (_req, res) => {
    res.json({
      provider: 'gemini',
      hasApiKey: true,
      last4: 'zY12',
      validatedAt: '2026-01-01T00:00:00Z',
    });
  });

  // Simulate policy endpoint (SHOULD redact)
  app.get('/api/policies', (_req, res) => {
    res.json({
      items: [],
      config: { geminiKey: 'AIzaSyD-abc123def456ghi789jkl012mno3456789' },
    });
  });

  // Simulate a plain text response that contains CC
  app.get('/api/test/cc', (_req, res) => {
    res.send('My card is 4111-1111-1111-1111');
  });

  // Simulate a plain text response that contains SSN
  app.get('/api/test/ssn', (_req, res) => {
    res.send('My SSN is 123-45-6789');
  });

  // Simulate a generic endpoint
  app.get('/api/dashboard', (_req, res) => {
    res.json({
      status: 'ok',
      apiKey: 'sk-proj-abcdefghijklmnopqrstuvwxyz1234567890',
    });
  });

  return app;
}

describe('sensitiveDataProtection middleware', () => {
  const app = buildTestApp();

  it('should NOT redact API key data on /api/user/settings/api-key', async () => {
    const res = await request(app).get('/api/user/settings/api-key');
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('gemini');
    expect(res.body.hasApiKey).toBe(true);
    expect(res.body.last4).toBe('zY12');
    expect(res.body.validatedAt).toBe('2026-01-01T00:00:00Z');
  });

  it('SHOULD redact Gemini API key on /api/policies', async () => {
    const res = await request(app).get('/api/policies');
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.config.geminiKey).toBe('[REDACTED-API-KEY]');
  });

  it('SHOULD redact OpenAI API key on /api/dashboard', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.apiKey).toBe('[REDACTED-API-KEY]');
  });

  it('should redact credit card numbers in any response', async () => {
    const res = await request(app).get('/api/test/cc');
    expect(res.status).toBe(200);
    expect(res.text).toContain('[REDACTED-CC]');
    expect(res.text).not.toContain('4111-1111-1111-1111');
  });

  it('should redact SSNs in any response', async () => {
    const res = await request(app).get('/api/test/ssn');
    expect(res.status).toBe(200);
    expect(res.text).toContain('[REDACTED-SSN]');
    expect(res.text).not.toContain('123-45-6789');
  });
});
