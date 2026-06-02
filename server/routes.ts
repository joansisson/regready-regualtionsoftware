import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import crypto from "crypto";
import path from "path";
import {
  generatePolicy,
  analyzeComplianceRisk,
  validateLLMKey,
  suggestRemediation,
  type LLMProvider,
} from "./services/llmService";
import { generatePolicyPDF, generateRiskAssessmentPDF, generateComplianceReportPDF } from "./services/pdf-generator";
import { decryptByokKey } from "./services/byokCrypto";
import { requireAuth, type AuthenticatedRequest } from "./middleware/auth";

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const currentUserId = 1;
const llmKeySchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  provider: z.enum(["gemini"]).optional(),
});

const mockVendors = [
  {
    id: 1,
    name: "OpenAI",
    type: "ai-service",
    riskLevel: "low",
    gdprCompliant: true,
    soc2Compliant: true,
    aiActCompliant: false,
    lastAssessment: new Date().toISOString(),
    notes: "AI model provider for policy generation",
  },
  {
    id: 2,
    name: "Stripe",
    type: "payment-processing",
    riskLevel: "low",
    gdprCompliant: true,
    soc2Compliant: true,
    aiActCompliant: true,
    lastAssessment: new Date().toISOString(),
    notes: "Payment processing for subscription billing",
  },
  {
    id: 3,
    name: "Docker Hub",
    type: "infrastructure",
    riskLevel: "medium",
    gdprCompliant: true,
    soc2Compliant: true,
    aiActCompliant: true,
    lastAssessment: new Date().toISOString(),
    notes: "Container registry for deployment",
  },
];

const mockTeamMembers = [
  {
    id: "1",
    email: "admin@regready.com",
    firstName: "Admin",
    lastName: "User",
    role: "owner",
    status: "active",
    joinedAt: "2025-01-01T00:00:00Z",
    lastActive: new Date().toISOString(),
    permissions: ["*"],
    assignedProjects: ["GDPR Project", "SOC2 Audit"],
  },
  {
    id: "2",
    email: "compliance.manager@company.com",
    firstName: "Sarah",
    lastName: "Johnson",
    role: "admin",
    status: "active",
    joinedAt: "2025-02-15T00:00:00Z",
    lastActive: new Date().toISOString(),
    permissions: ["manage_policies", "review_documents", "manage_team"],
    assignedProjects: ["GDPR Project", "AI Act Compliance"],
  },
];

const mockTeamInvites = [
  {
    id: "inv_1",
    email: "new.member@company.com",
    role: "contributor",
    invitedBy: "Admin User",
    invitedAt: "2025-08-03T00:00:00Z",
    expiresAt: "2025-08-10T00:00:00Z",
    status: "pending",
  },
];

const mockWorkspaceActivities = [
  {
    id: "1",
    type: "policy_update",
    title: "GDPR Data Processing Policy Updated",
    description: "Added new section on cookie consent management",
    user: { id: "2", name: "Sarah Johnson", avatar: undefined },
    timestamp: new Date().toISOString(),
    relatedItem: { type: "policy", id: "1", title: "Data Processing Policy" },
  },
];

const mockWorkspaceComments = [
  {
    id: "1",
    content:
      "The data retention section needs clarification on the specific timeframes for different types of personal data.",
    user: { id: "3", name: "Michael Chen", avatar: undefined },
    timestamp: new Date().toISOString(),
    replies: [],
    isResolved: false,
  },
];

const mockWorkspaceTasks = [
  {
    id: "1",
    title: "Review GDPR Data Processing Procedures",
    description:
      "Conduct comprehensive review of current data processing activities and update documentation",
    priority: "high",
    status: "in_progress",
    assignee: { id: "2", name: "Sarah Johnson", avatar: undefined },
    dueDate: "2025-08-10T00:00:00Z",
    relatedPolicy: "Data Processing Policy",
    tags: ["GDPR", "Review", "Priority"],
  },
];

function looksLikeBcryptHash(value: string | null | undefined): boolean {
  if (!value) return false;
  // bcrypt hashes typically start with $2a$ / $2b$ / $2y$ / $2x$
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$") || value.startsWith("$2x$");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Exchange activation credentials for a JWT that the rest of /api can use.
  app.post(
    "/api/auth/login",
    asyncHandler(async (req: Request, res: Response) => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
        username: z.string().min(1),
      });

      const { email, password, username } = schema.parse(req.body);

      const existing = await storage.getUserByEmail(email);

      if (existing) {
        const storedPassword = (existing as any).password as string | undefined;
        if (!storedPassword) {
          return res.status(401).json({ error: "Invalid credentials", redirect: "/login" });
        }

        // Backward-compat: older installs may have plaintext placeholder passwords.
        const isBcrypt = looksLikeBcryptHash(storedPassword);
        let valid = false;

        if (isBcrypt) {
          valid = await storage.verifyPassword(email, password);
        } else {
          valid = storedPassword === password;
          // If it matches plaintext, upgrade to bcrypt hash.
          if (valid) {
            const hashed = await storage.hashPassword(password);
            await storage.updateUser(existing.id, { password: hashed } as any);
          }
        }

        if (!valid) {
          return res.status(401).json({ error: "Invalid credentials", redirect: "/login" });
        }
      } else {
        const hashed = await storage.hashPassword(password);

        // Create minimal local user. Other BYOK-related fields remain null until /api/user/settings/api-key is called.
        await storage.createUser({
          email,
          password: hashed,
          username,
          companyName: null,
          // Tenant scoping foundation: for now new local installs default to org=1.
          // Next step will enforce per-user/org in routes instead of hardcoding org/user IDs.
          organizationId: 1,
          role: "admin",
          llmProvider: "gemini",
          openaiApiKeyEncrypted: null,
          openaiApiKeyLast4: null,
          openaiApiKeyValidatedAt: null,
          geminiApiKeyEncrypted: null,
          geminiApiKeyLast4: null,
          geminiApiKeyValidatedAt: null,
        } as any);
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(500).json({ error: "Login failed", redirect: "/login" });
      }

      const token = storage.generateAuthToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          subscriptionTier: "local-pro",
          subscriptionStatus: "active",
        },
      });
    }),
  );

  // Authenticated user endpoint (fail closed).
  app.get(
    "/api/auth/user",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const user = await storage.getUserById(req.user.id);
      if (!user) return res.status(401).json({ error: "Not authenticated", redirect: "/login" });

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        companyName: user.companyName ?? null,
        role: user.role,

        // Keep frontend/client expectations consistent for network-exposed flows.
        subscriptionTier: req.user?.subscriptionTier ?? "pro",
        subscriptionStatus: req.user?.subscriptionStatus ?? "active",

        llmProvider: user.llmProvider ?? "gemini",

        // Keep the response shape compatible with existing frontend.
        openaiApiKeyEncrypted: user.openaiApiKeyEncrypted ?? null,
        openaiApiKeyLast4: user.openaiApiKeyLast4 ?? null,
        openaiApiKeyValidatedAt: user.openaiApiKeyValidatedAt ?? null,

        geminiApiKeyEncrypted: user.geminiApiKeyEncrypted ?? null,
        geminiApiKeyLast4: user.geminiApiKeyLast4 ?? null,
        geminiApiKeyValidatedAt: user.geminiApiKeyValidatedAt ?? null,

        createdAt: (user as any).createdAt ?? null,
        updatedAt: (user as any).updatedAt ?? null,
      });
    }),
  );

  app.get(
    "/api/dashboard/metrics",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const orgId = req.user.organizationId;

      const frameworks = await storage.getComplianceFrameworks();
      const policiesList = await storage.getPolicies(orgId);
      const riskAssessments = await storage.getRiskAssessments(orgId);

      const complianceOverview = frameworks.map((framework) => ({
        framework: framework.displayName,
        percentage: Number(framework.completionPercentage ?? 0),
        status: Number(framework.completionPercentage ?? 0) >= 80 ? "compliant" : "non-compliant",
      }));

      const recentActivities = [
        { title: "Policy review completed", timestamp: new Date().toISOString(), type: "policy" },
        { title: "Compliance check queued", timestamp: new Date().toISOString(), type: "compliance" },
      ];

      const avgRiskScore =
        riskAssessments.length > 0 ? riskAssessments.reduce((sum, r) => sum + r.riskScore, 0) / riskAssessments.length : 0;

      const pendingReviews = policiesList.filter((p) => p.status === "under-review").length;

      res.json({
        complianceOverview,
        recentActivities,
        riskScore: Math.round(avgRiskScore),
        totalPolicies: policiesList.length,
        pendingReviews,
      });
    }),
  );

  app.get(
    "/api/dashboard/analytics",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const orgId = req.user.organizationId;

      const frameworks = await storage.getComplianceFrameworks();
      const policiesList = await storage.getPolicies(orgId);
      const riskAssessments = await storage.getRiskAssessments(orgId);

    const frameworkCompletionValues = frameworks.map((f) => {
      if (typeof f.completionPercentage === "number") return f.completionPercentage;
      const parsed = parseFloat(String(f.completionPercentage ?? "0"));
      return Number.isFinite(parsed) ? parsed : 0;
    });
    const frameworksAvgCompletion =
      frameworkCompletionValues.length > 0
        ? frameworkCompletionValues.reduce((sum, v) => sum + v, 0) / frameworkCompletionValues.length
        : 0;

    const currentCompliance = Math.round(frameworksAvgCompletion);

    const previousCompliance = Math.max(0, Math.round(currentCompliance - Math.min(10, riskAssessments.length * 2)));
    const trend = currentCompliance > previousCompliance ? "up" : currentCompliance < previousCompliance ? "down" : "stable";

    const totalPolicies = policiesList.length;
    const approved = policiesList.filter((p) => p.status === "approved" || p.status === "final").length;
    const pending = policiesList.filter((p) => p.status === "under-review").length;

    const nowMs = Date.now();
    const overdueDaysThreshold = 45;
    const overdue = policiesList.filter((p) => {
      const createdMs = p.createdAt ? Date.parse(p.createdAt) : NaN;
      return (
        Number.isFinite(createdMs) &&
        nowMs - createdMs > overdueDaysThreshold * 24 * 60 * 60 * 1000 &&
        p.status !== "approved" &&
        p.status !== "final"
      );
    }).length;

    // teamActivity
    const { documentCount } = await (async () => {
      const { documentVersions } = await import("@shared/schema");
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const [row] = await db.select({ documentCount: sql<number>`count(*)` }).from(documentVersions);
      return { documentCount: row?.documentCount ?? 0 };
    })();

    const { activeUsers } = await (async () => {
      const { users } = await import("@shared/schema");
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const [row] = await db.select({ activeUsers: sql<number>`count(*)` }).from(users);
      return { activeUsers: row?.activeUsers ?? 0 };
    })();

    const avgResponseTimeDays = (() => {
      const durations: number[] = [];

      for (const p of policiesList) {
        const createdMs = p.createdAt ? Date.parse(p.createdAt) : NaN;
        const endIso = p.updatedAt || p.approvedAt || null;
        const endMs = endIso ? Date.parse(endIso) : NaN;

        if (!Number.isFinite(createdMs) || !Number.isFinite(endMs)) continue;

        const diffDays = (endMs - createdMs) / (1000 * 60 * 60 * 24);
        if (diffDays > 0) durations.push(diffDays);
      }

      const avg = durations.length > 0 ? durations.reduce((s, v) => s + v, 0) / durations.length : 0;
      return `${avg.toFixed(1)} days`;
    })();

    const teamActivity = {
      activeUsers,
      documentsCreated: documentCount,
      reviewsCompleted: approved,
      avgResponseTime: avgResponseTimeDays,
    };

    const frameworkProgress = frameworks.map((f) => {
      const current =
        typeof f.completionPercentage === "number"
          ? f.completionPercentage
          : parseFloat(String(f.completionPercentage ?? "0"));

      const safeCurrent = Number.isFinite(current) ? current : 0;

      const daysUntilDeadline = Math.max(7, Math.round((100 - safeCurrent) * 3));
      const deadline = new Date(Date.now() + daysUntilDeadline * 24 * 60 * 60 * 1000).toISOString();

      return {
        name: f.displayName,
        current: safeCurrent,
        target: 100,
        deadline,
      };
    });

    const lastSixMonths = (() => {
      const d = new Date();
      const months: Array<{ year: number; monthIndex: number; monthLabel: string }> = [];
      for (let i = 5; i >= 0; i--) {
        const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const monthIndex = dt.getMonth();
        const year = dt.getFullYear();
        const monthLabel = dt.toLocaleString("en-US", { month: "short" });
        months.push({ year, monthIndex, monthLabel });
      }
      return months;
    })();

    const monthlyTrends = lastSixMonths.map(({ year, monthIndex, monthLabel }) => {
      const policiesInMonth = policiesList.filter((p) => {
        if (!p.createdAt) return false;
        const ms = Date.parse(p.createdAt);
        if (!Number.isFinite(ms)) return false;
        const dt = new Date(ms);
        return dt.getFullYear() === year && dt.getMonth() === monthIndex;
      });

      const risksInMonth = riskAssessments.filter((r) => {
        const createdAt = (r as any).createdAt as string | undefined;
        if (!createdAt) return false;
        const ms = Date.parse(createdAt);
        if (!Number.isFinite(ms)) return false;
        const dt = new Date(ms);
        return dt.getFullYear() === year && dt.getMonth() === monthIndex;
      });

      return {
        month: monthLabel,
        compliance: currentCompliance,
        policies: policiesInMonth.length,
        risks: risksInMonth.length,
      };
    });

    res.json({
      complianceScores: { current: currentCompliance, previous: previousCompliance, trend },
      policyMetrics: { total: totalPolicies, approved, pending, overdue },
      teamActivity,
      frameworkProgress,
      monthlyTrends,
    });
  }));

  app.get(
    "/api/policies",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      res.json(await storage.getPolicies(req.user.organizationId));
    }),
  );

  app.get(
    "/api/policies/:id",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const policyId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const policy = await storage.getPolicy(policyId, req.user.organizationId);
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      res.json(policy);
    }),
  );

  app.put(
    "/api/policies/:id",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const updatedPolicyId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const updatedPolicy = await storage.updatePolicy(updatedPolicyId, req.body, req.user.organizationId);
      if (!updatedPolicy) return res.status(404).json({ message: "Policy not found" });
      res.json(updatedPolicy);
    }),
  );

  app.post(
    "/api/policies",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const policy = await storage.createPolicy({
        ...req.body,
        createdBy: String(req.user.id),
        organizationId: req.user.organizationId,
      } as any);
      res.status(201).json(policy);
    }),
  );

  app.get(
    "/api/user/settings/api-key",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const user = await storage.getUserById(req.user.id);
      const provider: LLMProvider = "gemini";

      res.json({
        provider,
        hasApiKey: Boolean(user?.geminiApiKeyEncrypted),
        last4: user?.geminiApiKeyLast4 || null,
        validatedAt: user?.geminiApiKeyValidatedAt || null,
      });
    }),
  );

  app.get(
    "/api/user/settings/api-key/validate",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const user = await storage.getUserById(req.user.id);
      const provider: LLMProvider = "gemini";

      const storedApiKey =
        provider === "gemini"
          ? user?.geminiApiKeyEncrypted || undefined
          : user?.openaiApiKeyEncrypted || undefined;
      const apiKey = storedApiKey ? decryptByokKey(storedApiKey) ?? undefined : undefined;

      const hasApiKey = Boolean(apiKey);

      const last4 = provider === "gemini" ? user?.geminiApiKeyLast4 || null : user?.openaiApiKeyLast4 || null;

      const validatedAt = provider === "gemini" ? user?.geminiApiKeyValidatedAt || null : user?.openaiApiKeyValidatedAt || null;

      if (!apiKey) {
        res.json({
          provider,
          hasApiKey: false,
          isValidated: false,
          last4: null,
          validatedAt: null,
          message: "No API key saved for the selected provider.",
        });
        return;
      }

      const validation = await validateLLMKey(provider, apiKey);

      res.json({
        provider,
        hasApiKey: true,
        isValidated: validation.valid,
        last4: validation.last4 ?? last4,
        validatedAt,
        message: validation.message,
      });
    }),
  );

  app.post(
    "/api/user/settings/api-key",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const { apiKey } = llmKeySchema.parse(req.body);

      const existingUser = await storage.getUserById(req.user.id);
      const provider: LLMProvider = "gemini";

      const validation = await validateLLMKey(provider, apiKey);
      if (!validation.valid) {
        return res.status(400).json(validation);
      }

      const nowIso = new Date().toISOString();

      const updateData = {
        llmProvider: "gemini" as const,
        geminiApiKeyEncrypted: apiKey,
        geminiApiKeyLast4: validation.last4,
        geminiApiKeyValidatedAt: nowIso,
      };

      const updatedUser = existingUser
        ? await storage.updateUser(req.user.id, updateData)
        : await storage.createUser({
            email: "pro@regready.local",
            password: "placeholder-password",
            username: "Local Admin",
            role: "admin",
            organizationId: req.user.organizationId,
            ...updateData,
          } as any);

      res.json({
        valid: true,
        message: "Gemini API key saved and verified.",
        last4: validation.last4,
        hasApiKey: Boolean(updatedUser?.geminiApiKeyEncrypted),
      });
    }),
  );

  app.post(
    "/api/user/settings/api-key/test",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const { apiKey } = llmKeySchema.parse(req.body);

      const provider: LLMProvider = "gemini";

      const validation = await validateLLMKey(provider, apiKey);
      if (!validation.valid) {
        return res.status(400).json(validation);
      }

      res.json({
        provider,
        valid: true,
        message: validation.message,
        last4: validation.last4,
        validatedAt: new Date().toISOString(),
      });
    }),
  );

  app.post(
    "/api/user/settings/api-key/validate",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const { apiKey } = llmKeySchema.parse(req.body);
      const provider: LLMProvider = "gemini";

      const validation = await validateLLMKey(provider, apiKey);
      if (!validation.valid) {
        return res.status(400).json(validation);
      }

      res.json({
        provider,
        valid: true,
        message: validation.message,
        last4: validation.last4,
        validatedAt: new Date().toISOString(),
      });
    }),
  );

  app.post("/api/policies/generate", requireAuth, asyncHandler(async (req: any, res: Response) => {
    const schema = z.object({
      title: z.string().min(1),
      type: z.string().min(1),
      description: z.string().min(1),
      frameworks: z.array(z.string()),
    });
    const validatedData = schema.parse(req.body);

    const user = await storage.getUserById(req.user.id);

    await storage.createActivityLog({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      action: "policy_generate",
      entityType: "policy",
      entityId: null,
      metadata: {
        title: validatedData.title,
        type: validatedData.type,
        frameworks: validatedData.frameworks,
      },
    });

    const generatedPolicy = await generatePolicy(validatedData, user);

    res.json(generatedPolicy);
  }));

  app.get(
    "/api/audit-reports",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      res.json(await storage.getAuditReports(req.user.organizationId));
    }),
  );

  app.post(
    "/api/audit-reports",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const report = await storage.createAuditReport(req.body, req.user.organizationId);
      res.status(201).json(report);
    }),
  );

  app.post(
    "/api/audit-reports/:id/export",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const report = await storage.getAuditReport(id, req.user.organizationId);
      if (!report) return res.status(404).json({ message: "Audit report not found" });
      res.json({ ok: true, reportId: report.id, downloadUrl: `/api/audit-reports/${report.id}/export` });
    }),
  );

  app.post("/api/compliance-reports/export", requireAuth, asyncHandler(async (req: any, res: Response) => {
    const schema = z.object({
      title: z.string().min(1),
      templateId: z.string().min(1),
      format: z.enum(["pdf", "docx", "excel"]).default("pdf"),
      includeCertification: z.boolean().default(false),

      // Template/framework display names coming from the frontend (e.g. "GDPR", "SOC 2", "EU AI Act")
      frameworks: z.array(z.string()).default([]),

      // Optional for layout only
      sections: z.array(z.string()).default([]),
    });

    const validated = schema.parse(req.body);

    const orgId = req.user.organizationId;

    const { db } = await import("./db");
    const {
      complianceFrameworks,
      policies,
    } = await import("@shared/schema");
    const { and, eq, inArray, or } = await import("drizzle-orm");

    const frameworkRows = await db.select().from(complianceFrameworks);

    const selectedFrameworkNames = (() => {
      if (validated.frameworks.length === 0) return [];
      const normalized = new Set(validated.frameworks.map((s) => s.trim().toLowerCase()));
      return frameworkRows
        .filter((f) => normalized.has(String(f.displayName).trim().toLowerCase()) || normalized.has(String(f.name).trim().toLowerCase()))
        .map((f) => f.name);
    })();

    const policyFilter = (() => {
      // policies.frameworks is stored as JSON array (text[] mode).
      // Drizzle SQLite JSON filtering is inconsistent across configs, so we fetch org policies and filter in JS.
      return db.select().from(policies).where(eq(policies.organizationId, orgId));
    })();

    const allPolicies = await policyFilter;

    const filteredPolicies =
      selectedFrameworkNames.length > 0
        ? allPolicies.filter((p) => Array.isArray(p.frameworks) && p.frameworks.some((fw) => selectedFrameworkNames.includes(fw)))
        : allPolicies;

    await storage.createActivityLog({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      action: "compliance_report_export",
      entityType: "compliance_report",
      entityId: null,
      metadata: {
        title: validated.title,
        templateId: validated.templateId,
        format: validated.format,
        includeCertification: validated.includeCertification,
      },
    });

    const filepath = await generateComplianceReportPDF({
      title: validated.title,
      templateId: validated.templateId,
      format: validated.format,
      includeCertification: validated.includeCertification,
      frameworks: selectedFrameworkNames.length > 0 ? selectedFrameworkNames : validated.frameworks,
      policies: filteredPolicies.map((p) => ({
        id: p.id,
        title: p.title,
        type: p.type,
        version: p.version,
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        description: p.description ?? null,
        content: p.content ?? null,
        frameworks: p.frameworks ?? [],
      })),
      sections: validated.sections,
    });

    res.download(filepath);
  }));

  app.get(
    "/api/compliance-frameworks",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      res.json(await storage.getComplianceFrameworks());
    }),
  );

  app.get(
    "/api/vendors",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      const { db } = await import("./db");
      const { vendors } = await import("@shared/schema");
      const rows = await db.select().from(vendors);
      res.json(rows);
    }),
  );

  app.put(
    "/api/vendors/:id/dpa",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const schema = z.object({ dpaText: z.string().min(1, "DPA text is required") });
      const { dpaText } = schema.parse(req.body);
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

    const updated = await storage.updateVendor(id, { notes: dpaText } as any);
    if (!updated) return res.status(404).json({ message: "Vendor not found" });

      res.json({ ok: true, vendorId: updated.id, notesSaved: Boolean(updated.notes) });
    }),
  );

  app.get(
    "/api/team/members",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      const { db } = await import("./db");
      const { teamMembers } = await import("@shared/schema");
      const rows = await db.select().from(teamMembers);
      res.json(rows);
    }),
  );

  app.get(
    "/api/team/invites",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      res.json(mockTeamInvites);
    }),
  );

  app.post(
    "/api/team/invite",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      res.status(201).json({
        id: `inv_${Date.now()}`,
        ...req.body,
        invitedBy: "Admin User",
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      });
    }),
  );

  app.patch(
    "/api/team/members/:id",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      res.json({ id: req.params.id, ...req.body });
    }),
  );

  app.delete(
    "/api/team/members/:id",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/workspace/activities",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      res.json(mockWorkspaceActivities);
    }),
  );

  app.get(
    "/api/workspace/comments",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      res.json(mockWorkspaceComments);
    }),
  );

  app.get(
    "/api/workspace/tasks",
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      res.json(mockWorkspaceTasks);
    }),
  );

  app.post(
    "/api/workspace/comments",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      res.status(201).json({
        id: `comment_${Date.now()}`,
        ...req.body,
        user: { id: "1", name: "Admin User" },
        timestamp: new Date().toISOString(),
      });
    }),
  );

  app.patch(
    "/api/workspace/tasks/:id",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      res.json({ id: req.params.id, ...req.body });
    }),
  );

app.get("/api/recommendations", requireAuth, asyncHandler(async (req: any, res: Response) => {
  const orgId = req.user.organizationId;

    const { db } = await import("./db");
    const { eq } = await import("drizzle-orm");
    const { workspaceSettings, complianceFrameworks, complianceChecks, policies } = await import("@shared/schema");

    const workspaceRows = await db.select().from(workspaceSettings).where(eq(workspaceSettings.organizationId, orgId));
    const selectedFrameworkNames =
      workspaceRows[0]?.selectedFrameworks && workspaceRows[0].selectedFrameworks.length > 0
        ? workspaceRows[0].selectedFrameworks
        : [];

    const allFrameworkRows = await db.select().from(complianceFrameworks);

    const frameworksToUse =
      selectedFrameworkNames.length > 0
        ? allFrameworkRows.filter((f) => selectedFrameworkNames.includes(f.name))
        : allFrameworkRows;

    // Load all policies once; we’ll filter in JS (simpler + avoids SQLite JSON operators).
    const allPolicies = await db.select().from(policies).where(eq(policies.organizationId, orgId));

    const keywordGroups: Array<{
      match: (checkName: string) => boolean;
      keywords: string[];
      recommendation: (frameworkDisplayName: string) => {
        category: "security" | "privacy" | "compliance" | "governance";
        priority: "high" | "medium" | "low";
        impact: number;
        effort: number;
        timeline: string;
        riskReduction: number;
      };
    }> = [
      {
        match: (n) => /access control/i.test(n) || /access/i.test(n),
        keywords: ["access control", "access-management", "privileged access", "pam", "mfa", "role-based access", "rbac"],
        recommendation: (framework) => ({
          category: "security",
          priority: "high",
          impact: 90,
          effort: 45,
          timeline: "3-4 weeks",
          riskReduction: 50,
        }),
      },
      {
        match: (n) => /incident response/i.test(n) || /incident/i.test(n),
        keywords: ["incident response", "breach response", "tabletop", "drill", "notification workflow", "triage", "containment"],
        recommendation: (framework) => ({
          category: "compliance",
          priority: "medium",
          impact: 70,
          effort: 35,
          timeline: "2-3 weeks",
          riskReduction: 30,
        }),
      },
      {
        match: (n) => /gdpr art\. 30/i.test(n) || /records of processing/i.test(n) || /art\. 30/i.test(n),
        keywords: ["records of processing", "data inventory", "record of processing", "ropa", "processing activities", "retention"],
        recommendation: (_framework) => ({
          category: "privacy",
          priority: "high",
          impact: 85,
          effort: 60,
          timeline: "4-6 weeks",
          riskReduction: 40,
        }),
      },
      {
        match: (n) => /gdpr art\. 32/i.test(n) || /security of processing/i.test(n) || /art\. 32/i.test(n),
        keywords: ["security of processing", "encryption", "technical and organizational", "access control", "toms", "risk assessment"],
        recommendation: (_framework) => ({
          category: "privacy",
          priority: "high",
          impact: 80,
          effort: 55,
          timeline: "4-5 weeks",
          riskReduction: 38,
        }),
      },
      {
        match: (n) => /eu ai act/i.test(n) || /ai system documentation/i.test(n) || /governance/i.test(n),
        keywords: ["ai system documentation", "ai system inventory", "risk classification", "human oversight", "governance", "oversight"],
        recommendation: (_framework) => ({
          category: "governance",
          priority: "medium",
          impact: 75,
          effort: 70,
          timeline: "6-8 weeks",
          riskReduction: 35,
        }),
      },
    ];

    const recommendations: Array<{
      id: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      category: "security" | "privacy" | "compliance" | "governance";
      impact: number;
      effort: number;
      frameworks: string[];
      implementationSteps: string[];
      timeline: string;
      riskReduction: number;
    }> = [];

    for (const framework of frameworksToUse) {
      const checks = await db.select().from(complianceChecks).where(eq(complianceChecks.frameworkId, framework.id));

      for (const check of checks) {
        const matchingGroup =
          keywordGroups.find((g) => g.match(check.checkName)) ??
          keywordGroups.find((g) => /.+/i.test(check.checkName)) ??
          null;

        const keywords = matchingGroup?.keywords ?? [];
        const hasEvidence =
          allPolicies
            .filter((p) => Array.isArray(p.frameworks) && p.frameworks.includes(framework.name))
            .some((p) => {
              const haystack = `${p.title ?? ""}\n${p.description ?? ""}\n${p.content ?? ""}`.toLowerCase();
              return keywords.length > 0 ? keywords.some((k) => haystack.includes(k.toLowerCase())) : false;
            }) ?? false;

        if (hasEvidence) continue;

        const recMeta = matchingGroup?.recommendation(framework.displayName) ?? {
          category: "compliance" as const,
          priority: "medium" as const,
          impact: 60,
          effort: 50,
          timeline: "3-5 weeks",
          riskReduction: 25,
        };

        const recommendationId = `${framework.name}::${check.id}`;

        const implementationSteps =
          keywords.length > 0
            ? [
                `Review the requirement: ${check.checkName}`,
                `Create/Update a policy draft that addresses: ${keywords.slice(0, 3).join(", ")}`,
                `Add supporting content (procedures, scope, and enforcement details)`,
                `Submit for approval and track progress in this workspace`,
              ]
            : [
                `Review the requirement: ${check.checkName}`,
                `Create/Update a policy draft aligned with the requirement`,
                `Include evidence-ready content for audit-readiness`,
              ];

        recommendations.push({
          id: recommendationId,
          title: `Missing policy evidence for: ${check.checkName}`,
          description: check.description ?? `Add the required policy evidence for ${check.checkName}.`,
          priority: recMeta.priority,
          category: recMeta.category,
          impact: recMeta.impact,
          effort: recMeta.effort,
          frameworks: [framework.displayName],
          implementationSteps,
          timeline: recMeta.timeline,
          riskReduction: recMeta.riskReduction,
        });
      }
    }

    // ---------------------------
    // Stale-policy detection (Annual Review)
    // ---------------------------
    // Schema currently lacks `last_reviewed_at`, so we use `updatedAt` as a proxy.
    const staleThresholdMs = 365 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    const staleRecommendationByFramework = new Map<string, boolean>();

    for (const framework of frameworksToUse) {
      const stalePolicies = allPolicies.filter((p) => {
        const pFrameworks = Array.isArray(p.frameworks) ? p.frameworks : [];
        if (!pFrameworks.includes(framework.name)) return false;

        if (!p.updatedAt) return false;
        const updatedMs = Date.parse(p.updatedAt);
        if (!Number.isFinite(updatedMs)) return false;

        return nowMs - updatedMs > staleThresholdMs;
      });

      if (stalePolicies.length === 0) continue;

      const recId = `annual-review::${framework.name}`;
      if (staleRecommendationByFramework.get(recId)) continue;
      staleRecommendationByFramework.set(recId, true);

      const topPolicyTitles = stalePolicies.slice(0, 5).map((p) => p.title).filter(Boolean);

      recommendations.push({
        id: recId,
        title: `Annual Review Needed (${stalePolicies.length} stale policies)`,
        description:
          `One or more policies linked to ${framework.displayName} have not been reviewed in over 365 days. ` +
          `Flag them for Annual Review and refresh evidence.`,
        priority: stalePolicies.length >= 5 ? "high" : "medium",
        category: "governance",
        impact: stalePolicies.length >= 5 ? 85 : 70,
        effort: stalePolicies.length >= 5 ? 60 : 45,
        frameworks: [framework.displayName],
        implementationSteps: [
          `Review stale policies for ${framework.displayName}: ${topPolicyTitles.join(", ") || "(unknown titles)"}`,
          "Confirm ownership and review scope (update procedures, controls, and enforcement evidence)",
          "Update the policy content and set a new review date",
          "Submit updated policies for approval to restore evidence freshness",
        ],
        timeline: stalePolicies.length >= 5 ? "4-6 weeks" : "2-4 weeks",
        riskReduction: stalePolicies.length >= 5 ? 45 : 30,
      });
    }

    res.json(recommendations);
  }));

  app.post(
    "/api/recommendations/:id/implement",
    requireAuth,
    asyncHandler(async (req: Request & { user?: any }, res: Response) => {
      // Placeholder implementation: in future, tie recommendation IDs to concrete operations
      // and always enforce org scoping.
      res.json({ ok: true, recommendationId: req.params.id, organizationId: req.user!.organizationId });
    }),
  );

  app.post("/api/risk-assessments/analyze", requireAuth, asyncHandler(async (req: any, res: Response) => {
    const { description, frameworks } = req.body;
    const user = await storage.getUserById(req.user.id);

    await storage.createActivityLog({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      action: "risk_analyze",
      entityType: "risk_assessment",
      entityId: null,
      metadata: {
        descriptionPreview: typeof description === "string" ? description.slice(0, 200) : null,
        frameworks,
      },
    });

    const riskAnalysis = await analyzeComplianceRisk(description, frameworks, user);
    res.json(riskAnalysis);
  }));

  app.post("/api/risk-assessments/export", requireAuth, asyncHandler(async (req: any, res: Response) => {
    const schema = z.object({
      description: z.string().min(1),
      frameworks: z.array(z.string()).min(1),
      riskLevel: z.string().min(1),
      riskScore: z.number().int(),
      recommendations: z.array(z.string()).default([]),
      frameworkSpecificRisks: z.record(z.string()).default({}),
    });

    const validated = schema.parse(req.body);

    await storage.createActivityLog({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      action: "risk_assessment_export",
      entityType: "risk_assessment",
      entityId: null,
      metadata: {
        frameworks: validated.frameworks,
        riskLevel: validated.riskLevel,
        riskScore: validated.riskScore,
      },
    });

    const filepath = await generateRiskAssessmentPDF({
      description: validated.description,
      frameworks: validated.frameworks,
      riskLevel: validated.riskLevel,
      riskScore: validated.riskScore,
      recommendations: validated.recommendations,
      frameworkSpecificRisks: validated.frameworkSpecificRisks,
    });

    res.download(filepath);
  }));

  app.post("/api/remediation/suggest", requireAuth, asyncHandler(async (req: any, res: Response) => {
    const schema = z.object({
      frameworkControl: z.string().min(1, "frameworkControl is required"),
      policyText: z.string().min(1, "policyText is required"),
      industry: z.string().optional(),
      companySize: z.string().optional(),
      techStack: z.array(z.string()).optional(),

      persistPolicy: z.boolean().optional().default(false),
      targetStatus: z.enum(["draft", "under-review"]).optional().default("under-review"),
      policyTitle: z.string().optional(),

      proTipAnswers: z
        .object({
          auditBoundary: z
            .object({
              handlesPIIorPHI: z.enum(["none", "pii", "phi", "both"]).optional(),
              hasPhysicalOffices: z.boolean().optional(),
            })
            .optional(),
          evidencePipeline: z
            .object({
              primaryTicketingSystem: z.string().optional(),
              whereSystemLogsAreCentralized: z.string().optional(),
            })
            .optional(),
          accessControl: z
            .object({
              timeToRevokeOffboarding: z
                .enum(["same-day", "24-hours", "48-hours", "custom"])
                .optional(),
              customTimeToRevoke: z.string().optional(),
              authMethod: z.enum(["password-manager", "sso", "both", "other"]).optional(),
            })
            .optional(),
          infrastructureDetail: z
            .object({
              usesInfrastructureAsCode: z.boolean().optional(),
              dataRetentionPolicyDuration: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    });

    const validated = schema.parse(req.body);
    const user = await storage.getUserById(req.user.id);

    const suggestion = await suggestRemediation(validated, user);

    if (!validated.persistPolicy) {
      res.json(suggestion);
      return;
    }

    const frameworks = await storage.getComplianceFrameworks();
    const controlLower = validated.frameworkControl.toLowerCase();

    const matchedFrameworks = frameworks.filter((f) => {
      const displayName = (f.displayName || "").toLowerCase();
      const name = (f.name || "").toLowerCase();
      return controlLower.includes(displayName) || controlLower.includes(name);
    });

    const frameworkNames = matchedFrameworks.map((f) => f.name).filter(Boolean);
    const finalFrameworks = frameworkNames.length > 0 ? frameworkNames : ["gdpr"];

      const createdPolicy = await storage.createPolicy({
      type: "compliance",
      title: validated.policyTitle || `Remediation — ${validated.frameworkControl}`,
      description: suggestion.diffSummary,
      content: suggestion.suggestedPolicyPatch,
      version: "1.0",
      status: validated.targetStatus,
      frameworks: finalFrameworks,
      createdBy: "Current User",
      organizationId: req.user.organizationId,
      approvedBy: null,
    });

    res.json({
      ...suggestion,
      createdPolicy: { id: createdPolicy.id, title: createdPolicy.title, status: createdPolicy.status },
    });
  }));

  app.post("/api/remediation/scan-suggest", requireAuth, asyncHandler(async (req: any, res: Response) => {
    const schema = z.object({
      frameworkControl: z.string().min(1, "frameworkControl is required"),
      industry: z.string().optional(),
      companySize: z.string().optional(),
    });

    const validated = schema.parse(req.body);
    const user = await storage.getUserById(req.user.id);

    const frameworks = await storage.getComplianceFrameworks();
    const controlText = validated.frameworkControl.toLowerCase();

    const matchedFramework =
      frameworks.find((f) => controlText.includes((f.displayName || "").toLowerCase())) ||
      frameworks.find((f) => controlText.includes((f.name || "").toLowerCase()));

    if (!matchedFramework) {
      return res.status(400).json({
        message:
          "Could not infer a compliance framework from frameworkControl. Try including 'GDPR', 'SOC 2', or 'EU AI Act' in the input.",
      });
    }

    const checks = await storage.getComplianceChecks(matchedFramework.id);
    if (!checks || checks.length === 0) {
      return res.status(404).json({ message: "No compliance requirements found for the inferred framework." });
    }

    const chosenCheck =
      checks.find((c) => controlText.includes((c.checkName || "").toLowerCase())) ||
      checks.find((c) => (c.description || "").toLowerCase().includes(controlText)) ||
      checks[0];

    const allPolicies = await storage.getPolicies();
    const evidencePolicies = allPolicies.filter((p) => Array.isArray(p.frameworks) && p.frameworks.includes(matchedFramework.name));

    const policyText =
      evidencePolicies.length > 0
        ? evidencePolicies
            .slice(0, 6)
            .map((p) => `### ${p.title}\n${p.content || p.description || ""}`)
            .join("\n\n")
        : "";

    const vendors = await storage.getVendors();
    const techStack = vendors.map((v) => v.name);

    const suggestion = await suggestRemediation(
      {
        frameworkControl: chosenCheck.checkName,
        policyText,
        industry: validated.industry,
        companySize: validated.companySize,
        techStack,
      },
      user
    );

    res.json(suggestion);
  }));

  app.post(
    "/api/verified-links",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const schema = z.object({
        supplierName: z.string().min(1, "supplierName is required"),
        supplierDomain: z.string().min(1).optional(),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        badges: z.array(z.string()).optional(),
        documents: z
          .array(z.object({ title: z.string().min(1), url: z.string().url().optional() }))
          .optional(),
        expiresAt: z.string().optional(),
      });

      const validated = schema.parse(req.body);
      const token = crypto.randomBytes(24).toString("hex");

      const created = await storage.createVerifiedLink({
        token,
        organizationId: req.user.organizationId,
        supplierName: validated.supplierName,
        supplierDomain: validated.supplierDomain,
        industry: validated.industry,
        companySize: validated.companySize,
        badges: validated.badges ?? [],
        documents: validated.documents ?? [],
        expiresAt: validated.expiresAt,
      });

      res.json({
        token: created.token,
        trustCenterUrl: `/trust-center/${created.token}`,
        supplierName: created.supplierName,
        supplierDomain: created.supplierDomain,
      });
    }),
  );

  app.post(
    "/api/verified-links/generate",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const schema = z.object({
        supplierName: z.string().min(1, "supplierName is required"),
        supplierDomain: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.string().optional(),
        badges: z.array(z.string()).optional(),
        expiresAt: z.string().optional(),
        attachApprovedPolicies: z.boolean().optional().default(true),
      });

      const validated = schema.parse(req.body);
      const token = crypto.randomBytes(24).toString("hex");
      const orgId = req.user.organizationId;

      const expiresAt =
        validated.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const documents: Array<{ title: string; url?: string }> = [];

      if (validated.attachApprovedPolicies) {
        const policies = await storage.getPolicies(orgId);
        const approvedPolicies = policies.filter((p) => p.status === "approved" || p.status === "final");

        for (const policy of approvedPolicies) {
          documents.push({
            title: policy.title,
            url: `/api/trust-center/documents/policy/${policy.id}?token=${token}`,
          });
        }
      }

      const created = await storage.createVerifiedLink({
        token,
        organizationId: orgId,
        supplierName: validated.supplierName,
        supplierDomain: validated.supplierDomain,
        industry: validated.industry,
        companySize: validated.companySize,
        badges: validated.badges ?? [],
        documents,
        expiresAt,
      });

      res.json({
        token: created.token,
        trustCenterUrl: `/trust-center/${created.token}`,
        supplierName: created.supplierName,
        supplierDomain: created.supplierDomain,
        attachedDocuments: created.documents,
      });
    }),
  );

  app.get(
    "/api/trust-center/documents/policy/:id",
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const token = z.string().min(1).parse(req.query.token);

      const link = await storage.getVerifiedLinkByToken(token);
      if (!link) return res.status(404).send("Trust center not found");
      if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
        return res.status(410).send("Trust center link expired");
      }

      // Prevent token-holder from requesting arbitrary policy IDs.
      const expectedUrl = `/api/trust-center/documents/policy/${id}?token=${token}`;
      const attached =
        Array.isArray(link.documents) && link.documents.some((d) => typeof d.url === "string" && d.url === expectedUrl);

      if (!attached) {
        return res.status(403).send("Policy not attached to this trust center link");
      }

      // Tenant-scoped: only the owner org's policy may be served.
      const policy = await storage.getPolicy(id, link.organizationId);
      if (!policy) return res.status(404).send("Policy not found");

      await storage.createActivityLog({
        userId: req.user?.id ?? 1,
        organizationId: req.user?.organizationId ?? 1,
        action: "policy_export",
        entityType: "policy",
        entityId: String(policy.id),
        metadata: {
          status: policy.status,
          frameworks: policy.frameworks,
        },
      });


      const filepath = await generatePolicyPDF(policy);
      res.download(filepath);
    }),
  );

  app.get("/api/trust-center/:token", asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({ token: z.string().min(1) });
    const { token } = schema.parse({ token: req.params.token });

    const link = await storage.getVerifiedLinkByToken(token);
    if (!link) return res.status(404).json({ message: "Trust center not found" });

    res.json({
      token: link.token,
      supplierName: link.supplierName,
      supplierDomain: link.supplierDomain,
      industry: link.industry,
      companySize: link.companySize,
      badges: link.badges,
      documents: link.documents,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    });
  }));

  app.post(
    "/api/policies/:id/export",
    requireAuth,
    asyncHandler(async (req: any, res: Response) => {
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const policy = await storage.getPolicy(id, req.user.organizationId);
      if (!policy) return res.status(404).send("Policy not found");

      const filepath = await generatePolicyPDF(policy);
      res.download(filepath);
    }));

  app.get("/download/installer", asyncHandler(async (_req: Request, res: Response) => {
    const filepath = path.join(process.cwd(), "release", "RegReady Local Pro 1.0.0.exe");
    return res.sendFile(filepath, (err) => {
      if (err) {
        res.status(404).send("Installer not found. Ensure the build artifact exists in /release.");
      }
    });
  }));

  const httpServer = createServer(app);
  return httpServer;
}
