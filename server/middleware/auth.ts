import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    organizationId: number;
    subscriptionTier?: string;
    subscriptionStatus?: string;
    role?: string;
  };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Ensure ensureAppSecrets() ran before routes.");
  }
  return secret;
}

/**
 * Production-safe auth middleware:
 * - Requires a Bearer token
 * - Verifies JWT
 * - Loads the user from SQLite
 * - Sets req.user (or returns 401)
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required",
        redirect: "/login",
      });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({
        error: "Authentication required",
        redirect: "/login",
      });
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { userId?: unknown };
    const userId = typeof decoded?.userId === "number" ? decoded.userId : undefined;

    if (!userId) {
      return res.status(401).json({
        error: "Invalid authentication token",
        redirect: "/login",
      });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({
        error: "Invalid authentication token",
        redirect: "/login",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      organizationId: user.organizationId,
      role: user.role,
      subscriptionTier: "pro",
      subscriptionStatus: "active",
    };

    next();
  } catch (_err) {
    return res.status(401).json({
      error: "Invalid authentication",
      redirect: "/login",
    });
  }
};

export const requireSubscription = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      redirect: "/login",
    });
  }

  if (!req.user.subscriptionStatus || req.user.subscriptionStatus !== "active") {
    return res.status(403).json({
      error: "Active subscription required",
      redirect: "/subscription-required",
    });
  }

  next();
};

export const checkFeatureAccess = (feature: string, requiredTier: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const tierHierarchy: Record<string, number> = { starter: 1, pro: 2, agency: 3 };
    const userTier = req.user?.subscriptionTier || "starter";
    const userLevel = tierHierarchy[userTier] ?? 0;
    const requiredLevel = tierHierarchy[requiredTier] ?? 999;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Feature '${feature}' requires ${requiredTier} subscription or higher`,
        currentTier: userTier,
        requiredTier,
        upgrade: true,
      });
    }

    next();
  };
};
