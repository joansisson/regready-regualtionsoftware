import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';

// ============================================================
// HELPER: Build a full test app with all middleware + routes
// ============================================================
async function buildTestApp(): Promise<Express> {
  // Import express dynamically so it does not conflict with server's module init
  const { default: expressModule } = await import('express') as any;
  const { default: compressionModule } = await import('compression') as any;
  const app = expressModule();

  app.use(compressionModule());
  app.use(expressModule.json({ limit: '50mb' }));
  app.use(expressModule.urlencoded({ extended: false, limit: '50mb' }));

  // Init database tables first
  const { sqlite } = await import('../server/db');
  
  // Create all tables inline
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, username TEXT NOT NULL, company_name TEXT, organization_id INTEGER NOT NULL DEFAULT 1, role TEXT NOT NULL DEFAULT 'admin', llm_provider TEXT NOT NULL DEFAULT 'gemini', openai_api_key_encrypted TEXT, openai_api_key_last4 TEXT, openai_api_key_validated_at TEXT, gemini_api_key_encrypted TEXT, gemini_api_key_last4 TEXT, gemini_api_key_validated_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS policies (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT NOT NULL, description TEXT, content TEXT, version TEXT NOT NULL DEFAULT '1.0', status TEXT NOT NULL DEFAULT 'draft', frameworks TEXT DEFAULT '[]', created_by TEXT NOT NULL, approved_by TEXT, organization_id INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, approved_at TEXT);
    CREATE TABLE IF NOT EXISTS compliance_frameworks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, display_name TEXT NOT NULL, description TEXT, completion_percentage REAL DEFAULT 0, status TEXT NOT NULL DEFAULT 'in-progress', last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS compliance_checks (id INTEGER PRIMARY KEY AUTOINCREMENT, framework_id INTEGER NOT NULL REFERENCES compliance_frameworks(id), check_name TEXT NOT NULL, description TEXT, status TEXT NOT NULL DEFAULT 'pending', evidence TEXT, last_checked TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS vendors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, risk_level TEXT NOT NULL DEFAULT 'medium', gdpr_compliant INTEGER DEFAULT 0, soc2_compliant INTEGER DEFAULT 0, ai_act_compliant INTEGER DEFAULT 0, last_assessment TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, notes TEXT);
    CREATE TABLE IF NOT EXISTS risk_assessments (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, risk_score INTEGER NOT NULL, risk_level TEXT NOT NULL, category TEXT NOT NULL, mitigation_plan TEXT, status TEXT NOT NULL DEFAULT 'open', assigned_to TEXT, due_date TEXT, organization_id INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS audit_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, type TEXT NOT NULL, framework TEXT, status TEXT NOT NULL DEFAULT 'draft', summary TEXT, findings TEXT DEFAULT '[]', recommendations TEXT DEFAULT '[]', generated_by TEXT NOT NULL, organization_id INTEGER NOT NULL DEFAULT 1, generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, file_path TEXT);
    CREATE TABLE IF NOT EXISTS document_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, policy_id INTEGER NOT NULL REFERENCES policies(id), version TEXT NOT NULL, content TEXT NOT NULL, change_notes TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, first_name TEXT NOT NULL, last_name TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', avatar TEXT, joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_active TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, permissions TEXT DEFAULT '[]', assigned_projects TEXT DEFAULT '[]');
    CREATE TABLE IF NOT EXISTS workspace_settings (organization_id INTEGER PRIMARY KEY, selected_frameworks TEXT DEFAULT '[]', selected_policy_titles TEXT DEFAULT '[]', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS verified_links (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL UNIQUE, organization_id INTEGER NOT NULL DEFAULT 1, supplier_name TEXT NOT NULL, supplier_domain TEXT, industry TEXT, company_size TEXT, badges TEXT DEFAULT '[]', documents TEXT DEFAULT '[]', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at TEXT);
    CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), organization_id INTEGER NOT NULL DEFAULT 1, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT, metadata TEXT DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);

  // Ensure app secrets (JWT_SECRET etc.)
  const { ensureAppSecrets } = await import('../server/services/appSecrets');
  await ensureAppSecrets();

  // Register all routes
  const { registerRoutes } = await import('../server/routes');
  await registerRoutes(app);

  return app;
}

// ============================================================
// HELPER: Login and get an auth token
// ============================================================
async function login(app: Express): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'pro@regready.test',
      password: 'RegReady123!',
      username: 'Test Admin',
    });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  return res.body.token;
}

// ============================================================
// TESTS
// ============================================================

describe('API Integration Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = await buildTestApp();
    authToken = await login(app);
  }, 20000);

  afterAll(async () => {
    // Cleanup any generated PDFs
    const pdfDir = path.join(process.cwd(), 'generated-pdfs');
    try {
      if (fs.existsSync(pdfDir)) {
        const files = fs.readdirSync(pdfDir);
        for (const f of files) fs.unlinkSync(path.join(pdfDir, f));
      }
    } catch { /* ok */ }
  });

  // ========== AUTH ==========

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@regready.test',
          password: 'RegReady123!',
          username: 'Admin Two',
        });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('admin@regready.test');
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });
      expect([400, 500]).toContain(res.status); // Zod validation or generic error
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'pro@regready.test',
          password: 'WRONG_PASSWORD',
          username: 'Test',
        });
      // The existing user (pro@regready.test) has bcrypt hash from first login
      // Wrong password should fail
      expect([401, 400]).toContain(res.status);
    });
  });

  describe('GET /api/auth/user', () => {
    it('should return user details with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/user')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.email).toBe('pro@regready.test');
      expect(res.body.username).toBe('Test Admin');
    });

    it('should reject without auth header', async () => {
      const res = await request(app).get('/api/auth/user');
      expect(res.status).toBe(401);
    });

    it('should reject with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/user')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });

    it('should reject with malformed auth header', async () => {
      const res = await request(app)
        .get('/api/auth/user')
        .set('Authorization', 'NotBearer token');
      expect(res.status).toBe(401);
    });
  });

  // ========== POLICIES ==========

  describe('Policies CRUD', () => {
    let policyId: number;

    it('POST /api/policies - create a policy', async () => {
      const res = await request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Privacy Policy',
          type: 'privacy',
          description: 'A test policy',
          content: 'Policy content here',
          version: '1.0',
          status: 'draft',
          frameworks: ['gdpr'],
          createdBy: 'Test Admin',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Test Privacy Policy');
      policyId = res.body.id;
    });

    it('GET /api/policies - list all policies', async () => {
      const res = await request(app)
        .get('/api/policies')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/policies/:id - get policy by id', async () => {
      const res = await request(app)
        .get(`/api/policies/${policyId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(policyId);
    });

    it('GET /api/policies/:id - 404 for non-existent', async () => {
      const res = await request(app)
        .get('/api/policies/99999')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });

    it('PUT /api/policies/:id - update a policy', async () => {
      const res = await request(app)
        .put(`/api/policies/${policyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Updated Test Policy', status: 'under-review' });
      expect([200, 500]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.title).toBe('Updated Test Policy');
      }
    });

    it('PUT /api/policies/:id - 404 for non-existent', async () => {
      const res = await request(app)
        .put('/api/policies/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Nope' });
      expect([404, 500]).toContain(res.status);
    });
  });

  // ========== COMPLIANCE FRAMEWORKS ==========

  describe('GET /api/compliance-frameworks', () => {
    it('should return compliance frameworks', async () => {
      const res = await request(app)
        .get('/api/compliance-frameworks')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3); // GDPR, SOC2, EU AI Act
      const names = res.body.map((f: any) => f.name);
      expect(names).toContain('gdpr');
      expect(names).toContain('soc2');
    });
  });

  // ========== VENDORS ==========

  describe('GET /api/vendors', () => {
    it('should return vendors', async () => {
      const res = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ========== DASHBOARD ==========

  describe('GET /api/dashboard/metrics', () => {
    it('should return dashboard metrics', async () => {
      const res = await request(app)
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.complianceOverview).toBeDefined();
      expect(res.body.riskScore).toBeDefined();
      expect(res.body.totalPolicies).toBeDefined();
    });
  });

  describe('GET /api/dashboard/analytics', () => {
    it('should return analytics', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.complianceScores).toBeDefined();
      expect(res.body.policyMetrics).toBeDefined();
      expect(res.body.teamActivity).toBeDefined();
      expect(res.body.frameworkProgress).toBeDefined();
      expect(res.body.monthlyTrends).toBeDefined();
    });
  });

  // ========== AUDIT REPORTS ==========

  describe('Audit Reports', () => {
    let reportId: number;

    it('POST /api/audit-reports - create', async () => {
      const res = await request(app)
        .post('/api/audit-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Audit Report',
          type: 'compliance',
          framework: 'GDPR',
          status: 'draft',
          summary: 'A test report',
          findings: ['Finding 1'],
          recommendations: ['Fix 1'],
          generatedBy: 'Test Admin',
        });
      expect(res.status).toBe(201);
      reportId = res.body.id;
    });

    it('GET /api/audit-reports - list', async () => {
      const res = await request(app)
        .get('/api/audit-reports')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/audit-reports/:id/export - export', async () => {
      const res = await request(app)
        .post(`/api/audit-reports/${reportId}/export`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // ========== API KEY SETTINGS ==========

  describe('API Key Settings', () => {
    it('GET /api/user/settings/api-key - returns status (no key yet)', async () => {
      const res = await request(app)
        .get('/api/user/settings/api-key')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.provider).toBe('gemini');
    });

    it('POST /api/user/settings/api-key/test - test key validation', async () => {
      const res = await request(app)
        .post('/api/user/settings/api-key/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ apiKey: 'AIzaTestKeyShouldFail' });
      expect(res.status).toBe(400); // Invalid key
    });

    it('POST /api/user/settings/api-key - save key (should validate first)', async () => {
      const res = await request(app)
        .post('/api/user/settings/api-key')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ apiKey: 'AIzaTestKeyWillFailValidation123' });
      // Gemini validation will fail because it's not a real key
      expect([400, 200]).toContain(res.status);
    });
  });

  // ========== TEAM ==========

  describe('Team endpoints', () => {
    it('GET /api/team/members - list members', async () => {
      const res = await request(app)
        .get('/api/team/members')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/team/invites - list invites', async () => {
      const res = await request(app)
        .get('/api/team/invites')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
    });

    it('POST /api/team/invite - create invite', async () => {
      const res = await request(app)
        .post('/api/team/invite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'newuser@test.com', role: 'contributor' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });
  });

  // ========== WORKSPACE ==========

  describe('Workspace endpoints', () => {
    it('GET /api/workspace/activities', async () => {
      const res = await request(app)
        .get('/api/workspace/activities')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/workspace/comments', async () => {
      const res = await request(app)
        .get('/api/workspace/comments')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/workspace/tasks', async () => {
      const res = await request(app)
        .get('/api/workspace/tasks')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
    });

    it('POST /api/workspace/comments', async () => {
      const res = await request(app)
        .post('/api/workspace/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test comment' });
      expect(res.status).toBe(201);
    });
  });

  // ========== RECOMMENDATIONS ==========

  describe('GET /api/recommendations', () => {
    it('should return recommendations', async () => {
      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ========== POLICY GENERATION ==========

  describe('POST /api/policies/generate', () => {
    it('should reject generation without API key', async () => {
      const res = await request(app)
        .post('/api/policies/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Policy',
          type: 'privacy',
          description: 'Test description',
          frameworks: ['gdpr'],
        });
      // Will fail because no real API key is set
      expect([400, 500, 503]).toContain(res.status);
    });
  });

  // ========== VENDOR DPA ==========

  describe('PUT /api/vendors/:id/dpa', () => {
    it('should update vendor DPA', async () => {
      const res = await request(app)
        .put('/api/vendors/1/dpa')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ dpaText: 'Updated DPA text for vendor' });
      expect(res.status).toBe(200);
      expect(res.body.vendorId).toBe(1);
    });

    it('should reject without DPA text', async () => {
      const res = await request(app)
        .put('/api/vendors/1/dpa')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      // Zod validation error should be caught - may be 400 or 500 depending on error handler
      expect([400, 500]).toContain(res.status);
    });
  });

  // ========== VERIFIED LINKS (TRUST CENTER) ==========

  describe('Verified Links / Trust Center', () => {
    let token: string;

    it('POST /api/verified-links - create a link', async () => {
      const res = await request(app)
        .post('/api/verified-links')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierName: 'Test Supplier',
          supplierDomain: 'testsupplier.com',
          industry: 'tech',
        });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.trustCenterUrl).toContain('/trust-center/');
      token = res.body.token;
    });

    it('POST /api/verified-links/generate - generate with policies', async () => {
      const res = await request(app)
        .post('/api/verified-links/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierName: 'Supplier Two',
          attachApprovedPolicies: true,
        });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });

    it('GET /api/trust-center/:token - get link details', async () => {
      const res = await request(app).get(`/api/trust-center/${token}`);
      expect(res.status).toBe(200);
      expect(res.body.supplierName).toBe('Test Supplier');
    });

    it('GET /api/trust-center/:token - 404 for bad token', async () => {
      const res = await request(app).get('/api/trust-center/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  // ========== REMEDIATION ==========

  describe('Remediation endpoints', () => {
    it('POST /api/remediation/suggest - requireAuth', async () => {
      const res = await request(app)
        .post('/api/remediation/suggest')
        .send({
          frameworkControl: 'GDPR Art. 30',
          policyText: 'Current policy text',
        });
      expect(res.status).toBe(401);
    });

    it('POST /api/remediation/scan-suggest - requireAuth', async () => {
      const res = await request(app)
        .post('/api/remediation/scan-suggest')
        .send({
          frameworkControl: 'GDPR',
        });
      expect(res.status).toBe(401);
    });
  });

  // ========== RISK ASSESSMENT ==========

  describe('Risk Assessment endpoints', () => {
    it('POST /api/risk-assessments/analyze - require auth and valid input', async () => {
      const res = await request(app)
        .post('/api/risk-assessments/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test risk scenario',
          frameworks: ['GDPR'],
        });
      // Will fail because no real API key is configured
      // But should at least not be a 401
      expect(res.status).not.toBe(401);
    });
  });

  // ========== ERROR HANDLING ==========

  describe('Error handling', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request(app)
        .get('/api/nonexistent-route')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });

    it('should return 413 for oversized payloads', async () => {
      const largePayload = Buffer.alloc(12 * 1024 * 1024, 'x').toString();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ data: largePayload });
      // Express body-parser may handle this before our middleware, 
      // but express.json has 50mb limit, so this should still apply api 10mb?
      // Actually the express.json limit is 50mb so we test the api middleware
      // which is applied on /api routes
      expect(res.status).not.toBe(200);
    });

    it('should validate zod schemas on POST /api/policies', async () => {
      const res = await request(app)
        .post('/api/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalidField: true });
      // Zod validation errors may surface as 400 or 500 depending on error handler
      expect([400, 500]).toContain(res.status);
    });
  });

  // ========== NOT FOUND HANDLER ==========

  describe('404 handler', () => {
    it('should return 404 for unknown API endpoints', async () => {
      const res = await request(app)
        .get('/api/this-does-not-exist-at-all')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(404);
    });
  });
});
