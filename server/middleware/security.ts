import { Request, Response, NextFunction } from 'express';
import { security } from '../services/security';
import { createError } from './errorHandler';

export interface SecureRequest extends Request {
  securityScore?: number;
  isValidated?: boolean;
}

// Security validation middleware
export const securityMiddleware = (req: SecureRequest, res: Response, next: NextFunction) => {
  // Check if IP is blocked (fail closed)
  if (security.isIPBlocked(req.ip || "")) {
    return res.status(403).json({
      error: 'Access denied',
      code: 'IP_BLOCKED',
      message: 'Your IP address has been temporarily blocked due to suspicious activity'
    });
  }

  // Validate request integrity (log-only to avoid breaking legitimate payloads)
  try {
    const ok = security.validateRequestIntegrity(req);
    if (!ok) {
      console.warn('[SECURITY] validateRequestIntegrity failed (log-only)', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
    }
  } catch (e) {
    // Never block production traffic due to heuristic validator issues
    console.warn('[SECURITY] validateRequestIntegrity threw (log-only)', e);
  }

  // IMPORTANT: Do not mutate req.body/req.query in middleware.
  // Sanitization that strips/rewrites user payloads can break real features.
  req.isValidated = true;
  next();
};

// CSRF protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const hasBearerToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

  // Auth is done via Bearer JWT (Authorization header), not cookie sessions.
  // If a Bearer token exists, CSRF is not applicable.
  if (hasBearerToken) return next();

  // Never enforce CSRF on the login endpoint (it will not have Bearer token yet)
  if (req.path === '/api/auth/login') return next();

  // Fail closed in production only when state-changing requests arrive without Bearer auth
  if (
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) &&
    process.env.NODE_ENV === 'production'
  ) {
    const token = req.headers['x-csrf-token'] || (req.body as { _csrf?: unknown } | undefined)?._csrf;

    if (!token) {
      return res.status(403).json({
        error: 'CSRF token required',
        code: 'CSRF_MISSING'
      });
    }
  }

  next();
};

// Content Security Policy
export const contentSecurityPolicy = (req: Request, res: Response, next: NextFunction) => {
  const isProd = process.env.NODE_ENV === "production";
  const isElectronDesktop = process.env.ELECTRON_DESKTOP === "true";

  // Electron renderer bundles in this repo rely on some inline styles.
  // Allow unsafe-inline for desktop runs to prevent blank/blocked UI.
  const allowInlineForClient = !isProd || isElectronDesktop;

  const scriptSrc = allowInlineForClient ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";

  const styleSrc = allowInlineForClient
    ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"
    : "style-src 'self' https://fonts.googleapis.com";

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-src 'self'"
  ].join('; '));

  next();
};

// Security headers
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict transport security (HTTPS only)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=(self)'
  ].join(', '));

  next();
};

// Request size limiting
export const requestSizeLimit = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize: `${maxSize / (1024 * 1024)}MB`
      });
    }

    next();
  };
};

// Sensitive data detection
export const sensitiveDataProtection = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;

  res.send = function(data: any) {
    // Check for sensitive data patterns in response
    if (typeof data === 'string') {
      // Remove potential credit card numbers
      data = data.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED-CC]');

      // Remove potential SSNs
      data = data.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');

      // Remove potential API keys
      data = data.replace(/\b[a-zA-Z0-9]{32,}\b/g, (match: string) => {
        if (match.toLowerCase().includes('key') || match.toLowerCase().includes('token')) {
          return '[REDACTED-KEY]';
        }
        return match;
      });
    }

    return originalSend.call(this, data);
  };

  next();
};
