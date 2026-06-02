import { Request, Response, NextFunction } from "express";

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

// Bounded in-memory store (desktop single-process safe-ish).
// For multi-instance deployments, swap this for Redis or another shared store.
const store = new Map<string, RateLimitEntry>();

function getRateLimitMaxKeys(): number {
  const raw = process.env.RATE_LIMIT_MAX_KEYS;
  const parsed = raw ? Number(raw) : NaN;
  // Default: 10k unique keys (reasonable upper bound to prevent unbounded growth).
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 10_000;
}

function cleanupExpired(now: number) {
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (entry.resetTime <= now) keysToDelete.push(key);
  });
  for (const key of keysToDelete) store.delete(key);
}

function evictIfTooLarge(now: number) {
  const maxKeys = getRateLimitMaxKeys();
  if (store.size <= maxKeys) return;

  // First clean expired keys so we don't evict active ones unnecessarily.
  cleanupExpired(now);

  // If still too large, evict the soonest-to-expire entries.
  if (store.size <= maxKeys) return;

  const entries: Array<[string, RateLimitEntry]> = [];
  store.forEach((value, key) => entries.push([key, value]));

  entries.sort((a, b) => a[1].resetTime - b[1].resetTime);

  const targetSize = maxKeys;
  for (let i = 0; i < entries.length && store.size > targetSize; i++) {
    store.delete(entries[i][0]);
  }
}

export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) => {
  const {
    windowMs,
    max,
    message = "Too many requests",
    keyGenerator = (req) => req.ip || req.connection?.remoteAddress || "unknown",
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    cleanupExpired(now);
    evictIfTooLarge(now);

    const existing = store.get(key);

    if (!existing) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (existing.resetTime <= now) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((existing.resetTime - now) / 1000),
      });
    }

    existing.count += 1;
    store.set(key, existing);
    return next();
  };
};

// Predefined rate limiters for different use cases
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "API rate limit exceeded. Please try again later.",
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 auth attempts per window (much more generous for live users)
  message: "Too many authentication attempts. Please try again later.",
});

export const aiGenerationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI generations per hour for starter, more for higher tiers
  message: "AI generation rate limit exceeded. Upgrade your plan for higher limits.",
});
