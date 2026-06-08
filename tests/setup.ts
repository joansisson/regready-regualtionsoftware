import { beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';

// Generate deterministic secrets for testing
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = crypto.randomBytes(16).toString('hex');
process.env.NODE_ENV = 'test';
const TEST_DB_PATH = path.join(os.tmpdir(), `regready-test-${Date.now()}.db`);
process.env.REGREADY_DB_PATH = TEST_DB_PATH;
process.env.RATE_LIMIT_MAX_KEYS = '10000';

beforeAll(() => {
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch { /* ok */ }
});

afterAll(() => {
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch { /* ok */ }

  const pdfDir = path.join(process.cwd(), 'generated-pdfs');
  try {
    if (fs.existsSync(pdfDir)) {
      const entries = fs.readdirSync(pdfDir);
      for (const name of entries) {
        fs.unlinkSync(path.join(pdfDir, name));
      }
    }
  } catch { /* ok */ }
});
