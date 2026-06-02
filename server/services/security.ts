import crypto from 'crypto';
import { Request } from 'express';

interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit_exceeded' | 'unauthorized_access' | 'data_breach_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  userId?: number;
}

class SecurityService {
  private securityEvents: SecurityEvent[] = [];
  private suspiciousIPs: Set<string> = new Set();
  private failedLoginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  // Input sanitization
  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potential XSS patterns
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  // SQL injection detection
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /('|"|\-\-|\;|\||\/\*|\*\/)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\bUNION\s+SELECT)/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Rate limiting tracking
  trackFailedLogin(identifier: string, req: Request) {
    const current = this.failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Reset count if last attempt was more than 15 minutes ago
    if (now - current.lastAttempt > 15 * 60 * 1000) {
      current.count = 0;
    }
    
    current.count++;
    current.lastAttempt = now;
    this.failedLoginAttempts.set(identifier, current);

    // Track security event
    if (current.count >= 3) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: current.count >= 10 ? 'critical' : 'medium',
        details: {
          failedAttempts: current.count,
          identifier,
          timeWindow: '15m'
        },
        timestamp: now,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Block IP after 10 failed attempts
      if (current.count >= 10 && req.ip) {
        this.suspiciousIPs.add(req.ip);
      }
    }

    return current.count;
  }

  // Check if IP is blocked
  isIPBlocked(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  // Data encryption utilities (production-grade AES-256-GCM)
  // Format: ivHex:tagHex:cipherHex
  encrypt(text: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

    // Ensure we have a real 32-byte key buffer for AES-256.
    // (ENCRYPTION_KEY may be a hex-string or arbitrary string; hashing normalizes it.)
    const keyBuf = crypto.createHash('sha256').update(encryptionKey).digest(); // 32 bytes

    const iv = crypto.randomBytes(12); // 96-bit nonce recommended for GCM
    const algorithm = 'aes-256-gcm';

    const cipher = crypto.createCipheriv(algorithm, keyBuf, iv);
    const cipherHex = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('hex');
    const tagHex = cipher.getAuthTag().toString('hex');

    return iv.toString('hex') + ':' + tagHex + ':' + cipherHex;
  }

  decrypt(encryptedText: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

    const keyBuf = crypto.createHash('sha256').update(encryptionKey).digest(); // 32 bytes
    const algorithm = 'aes-256-gcm';

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, keyBuf, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');

    return decrypted;
  }

  // Hash sensitive data
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate secure tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Validate request integrity
  validateRequestIntegrity(req: Request): boolean {
    // Check for common attack patterns
    const userAgent = req.get('User-Agent') || '';
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /burp/i,
      /wget/i,
      /curl.*bot/i
    ];

    const isSuspiciousUserAgent = suspiciousPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspiciousUserAgent) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: {
          reason: 'Suspicious User-Agent',
          userAgent,
          path: req.path
        },
        timestamp: Date.now(),
        userAgent,
        ip: req.ip
      });
      return false;
    }

    // Check for SQL injection in query parameters
    const queryString = new URLSearchParams(req.query as any).toString();
    if (this.detectSQLInjection(queryString)) {
      this.logSecurityEvent({
        type: 'data_breach_attempt',
        severity: 'high',
        details: {
          reason: 'SQL Injection attempt in query parameters',
          query: queryString,
          path: req.path
        },
        timestamp: Date.now(),
        userAgent,
        ip: req.ip
      });
      return false;
    }

    return true;
  }

  // Log security events
  private logSecurityEvent(event: SecurityEvent) {
    this.securityEvents.push(event);
    
    // Console logging for development
    console.warn(`[SECURITY] ${event.type} - ${event.severity}:`, event.details);

    // In production, send to security monitoring service
    if (event.severity === 'critical' || event.severity === 'high') {
      // Alert security team immediately
      this.alertSecurityTeam(event);
    }
  }

  // Get security dashboard data
  getSecurityMetrics(timeRange: '1h' | '24h' | '7d' = '24h') {
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = Date.now() - timeRangeMs[timeRange];
    const recentEvents = this.securityEvents.filter(e => e.timestamp > cutoff);

    return {
      totalSecurityEvents: recentEvents.length,
      eventsBySeverity: {
        critical: recentEvents.filter(e => e.severity === 'critical').length,
        high: recentEvents.filter(e => e.severity === 'high').length,
        medium: recentEvents.filter(e => e.severity === 'medium').length,
        low: recentEvents.filter(e => e.severity === 'low').length
      },
      eventsByType: {
        suspicious_activity: recentEvents.filter(e => e.type === 'suspicious_activity').length,
        rate_limit_exceeded: recentEvents.filter(e => e.type === 'rate_limit_exceeded').length,
        unauthorized_access: recentEvents.filter(e => e.type === 'unauthorized_access').length,
        data_breach_attempt: recentEvents.filter(e => e.type === 'data_breach_attempt').length
      },
      blockedIPs: Array.from(this.suspiciousIPs),
      failedLoginAttempts: Object.fromEntries(this.failedLoginAttempts),
      recentEvents: recentEvents.slice(-10) // Last 10 events
    };
  }

  // Alert security team (mock implementation)
  private alertSecurityTeam(event: SecurityEvent) {
    // In production, this would integrate with:
    // - Slack/Teams notifications
    // - PagerDuty alerts
    // - Email notifications
    // - SIEM systems
    console.error(`[SECURITY ALERT] ${event.severity.toUpperCase()}: ${event.type}`, event);
  }

  // GDPR compliance utilities
  anonymizeUserData(data: any): any {
    const sensitiveFields = ['email', 'phone', 'address', 'ssn', 'credit_card'];
    
    if (typeof data === 'object' && data !== null) {
      const anonymized = { ...data };
      
      for (const field of sensitiveFields) {
        if (anonymized[field]) {
          anonymized[field] = this.hash(anonymized[field].toString());
        }
      }
      
      return anonymized;
    }
    
    return data;
  }
}

export const security = new SecurityService();
export default security;
