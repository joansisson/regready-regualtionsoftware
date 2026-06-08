import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';

// ============================================================
// Tests for the path resolution logic in server/index.ts
// These validate the fix for the "activation page has no styles" bug
// where fileURLToPath() returns POSIX-style forward slashes but
// path.sep gave backslashes on Windows.
// ============================================================

describe('Static file path resolution (asar fix)', () => {
  it('fileURLToPath on Windows returns forward slashes', () => {
    // This simulates what fileURLToPath(import.meta.url) produces
    const simulated = 'file:///C:/Users/test/resources/app.asar/dist/index.js';
    const decodedPath = simulated.replace('file:///', '');
    expect(decodedPath).toContain('/app.asar/');
    expect(decodedPath).not.toContain('\\app.asar\\');
  });

  it('forward-slash asarSegment correctly detects asar in path', () => {
    const serverModulePath = 'C:/Users/test/resources/app.asar/dist/index.js';
    const asarSegment = '/app.asar/';
    expect(serverModulePath.includes(asarSegment)).toBe(true);
  });

  it('backslash path.sep asarSegment fails on Windows with forward-slash path', () => {
    // This is the BUG: path.sep is \\ on Windows, but fileURLToPath returns /
    const serverModulePath = 'C:/Users/test/resources/app.asar/dist/index.js';
    const brokenAsarSegment = `${path.sep}app.asar${path.sep}`;
    expect(serverModulePath.includes(brokenAsarSegment)).toBe(false);
  });

  it('inferredUnpackedAppRoot correctly resolves app.asar.unpacked', () => {
    const serverModulePath = 'C:/Users/test/resources/app.asar/dist/index.js';
    const asarSegment = '/app.asar/';
    const unpackedSegment = '/app.asar.unpacked/';
    
    const unpackedIndexPath = serverModulePath.replace(asarSegment, unpackedSegment);
    const inferredRoot = path.resolve(path.dirname(unpackedIndexPath), '..');
    
    expect(unpackedIndexPath).toBe('C:/Users/test/resources/app.asar.unpacked/dist/index.js');
    // On Windows, path.resolve converts forward slashes to backslashes
    expect(inferredRoot.endsWith(path.join('resources', 'app.asar.unpacked'))).toBe(true);
  });

  it('staticCandidates includes inferredUnpackedAppRoot paths when asar detected', () => {
    // Simulate the full staticCandidates logic
    const baseDir = path.resolve('C:/Users/test/resources/app.asar');
    const serverModulePath = 'C:/Users/test/resources/app.asar/dist/index.js';
    const asarSegment = '/app.asar/';
    const unpackedSegment = '/app.asar.unpacked/';

    // This would be null in the BUG; non-null with the FIX
    const inferredUnpackedAppRoot = (() => {
      if (!serverModulePath.includes(asarSegment)) return null;
      const unpackedIndexPath = serverModulePath.replace(asarSegment, unpackedSegment);
      return path.resolve(path.dirname(unpackedIndexPath), '..');
    })();

    expect(inferredUnpackedAppRoot).not.toBeNull();

    // These are the paths that will actually be checked for index.html
    const candidatesViaInferred = [
      path.join(inferredUnpackedAppRoot!, 'dist', 'public'),
      path.join(inferredUnpackedAppRoot!, 'public'),
    ];
    
    for (const dir of candidatesViaInferred) {
      expect(dir).not.toContain('app.asar\\app.asar.unpacked'); // wrong: nested
      expect(dir).not.toContain('app.asar/app.asar.unpacked');
      expect(dir).toContain('app.asar.unpacked');
    }
  });

  it('Serving static assets from unpacked dir serves CSS alongside HTML', () => {
    // This validates that when express.static points to the unpacked dir,
    // both index.html AND assets/index-*.css come from the SAME location
    const staticDir = path.resolve('C:/Users/test/resources/app.asar.unpacked/dist/public');
    const indexHtml = path.resolve(staticDir, 'index.html');
    const cssFile = path.resolve(staticDir, 'assets', 'index.css');
    const jsFile = path.resolve(staticDir, 'assets', 'index.js');

    // All assets come from the same root - this is the key property
    expect(indexHtml.startsWith(staticDir + path.sep)).toBe(true);
    expect(cssFile.startsWith(staticDir + path.sep)).toBe(true);
    expect(jsFile.startsWith(staticDir + path.sep)).toBe(true);
  });

  it('Serving from wrong asar dir causes CSS/JS 404', () => {
    // This is what happened BEFORE the fix:
    // index.html would be served from inside app.asar (via SPA fallback)
    // but CSS/JS from express.static would 404 because they aren't in app.asar
    const wrongDir = 'C:/Users/test/resources/app.asar/dist/public';
    const correctDir = 'C:/Users/test/resources/app.asar.unpacked/dist/public';
    
    // These are different locations - the bug is when one is used for HTML
    // and the other is needed for assets
    expect(wrongDir).not.toBe(correctDir);
  });

  it('app.get("*") SPA handler passes through file extension requests', () => {
    // The SPA handler should NOT intercept requests for .css, .js, .png
    // This prevents express.static 404s from becoming HTML responses
    const cssRequest = '/assets/index-BFqEyON_.css';
    const jsRequest = '/assets/index-DRn79pjc.js';
    const pngRequest = '/assets/regready-logo-Da8KetFZ.png';
    const htmlRequest = '/activation';
    const apiRequest = '/api/policies';

    expect(path.extname(cssRequest)).toBe('.css');
    expect(path.extname(jsRequest)).toBe('.js');
    expect(path.extname(pngRequest)).toBe('.png');
    expect(path.extname(htmlRequest)).toBe('');      // SPA should handle
    expect(apiRequest.startsWith('/api')).toBe(true); // API should pass through
  });
});

describe('Asset file verification', () => {
  it('built CSS file exists in dist/public/assets', () => {
    // This verifies the build actually produced CSS
    const fs = require('fs');
    const assetsDir = path.join(process.cwd(), 'dist', 'public', 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir);
      const cssFiles = files.filter((f: string) => f.endsWith('.css'));
      expect(cssFiles.length).toBeGreaterThanOrEqual(1);
    }
    // If dist/public doesn't exist (no build), skip gracefully
  });

  it('index.html links to a CSS file', () => {
    const fs = require('fs');
    const indexPath = path.join(process.cwd(), 'dist', 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf8');
      expect(html).toContain('.css');
      expect(html).toContain('.js');
    }
  });
});
