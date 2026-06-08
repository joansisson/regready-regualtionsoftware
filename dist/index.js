var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLogs: () => activityLogs,
  appSecrets: () => appSecrets,
  auditReports: () => auditReports,
  complianceChecks: () => complianceChecks,
  complianceFrameworks: () => complianceFrameworks,
  documentVersions: () => documentVersions,
  insertActivityLogSchema: () => insertActivityLogSchema,
  insertAppSecretSchema: () => insertAppSecretSchema,
  insertAuditReportSchema: () => insertAuditReportSchema,
  insertComplianceCheckSchema: () => insertComplianceCheckSchema,
  insertComplianceFrameworkSchema: () => insertComplianceFrameworkSchema,
  insertDocumentVersionSchema: () => insertDocumentVersionSchema,
  insertGeminiKeySchema: () => insertGeminiKeySchema,
  insertOpenAiKeySchema: () => insertOpenAiKeySchema,
  insertPolicySchema: () => insertPolicySchema,
  insertRiskAssessmentSchema: () => insertRiskAssessmentSchema,
  insertTeamMemberSchema: () => insertTeamMemberSchema,
  insertUserSchema: () => insertUserSchema,
  insertVendorSchema: () => insertVendorSchema,
  insertVerifiedLinkSchema: () => insertVerifiedLinkSchema,
  insertWorkspaceSettingsSchema: () => insertWorkspaceSettingsSchema,
  policies: () => policies,
  riskAssessments: () => riskAssessments,
  teamMembers: () => teamMembers,
  users: () => users,
  vendors: () => vendors,
  verifiedLinks: () => verifiedLinks,
  workspaceSettings: () => workspaceSettings
});
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users, appSecrets, insertAppSecretSchema, insertUserSchema, policies, complianceFrameworks, complianceChecks, vendors, riskAssessments, auditReports, documentVersions, insertPolicySchema, insertComplianceFrameworkSchema, insertComplianceCheckSchema, insertVendorSchema, insertRiskAssessmentSchema, insertAuditReportSchema, insertDocumentVersionSchema, insertOpenAiKeySchema, insertGeminiKeySchema, teamMembers, insertTeamMemberSchema, workspaceSettings, insertWorkspaceSettingsSchema, verifiedLinks, insertVerifiedLinkSchema, activityLogs, insertActivityLogSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = sqliteTable("users", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      email: text("email").notNull().unique(),
      password: text("password").notNull(),
      username: text("username").notNull(),
      companyName: text("company_name"),
      // Tenant scoping: every user belongs to an organization
      organizationId: integer("organization_id").notNull().default(1),
      role: text("role").notNull().default("admin"),
      // Provider selection for LLM calls (BYOK)
      llmProvider: text("llm_provider").notNull().default("gemini"),
      // OpenAI BYOK
      openaiApiKeyEncrypted: text("openai_api_key_encrypted"),
      openaiApiKeyLast4: text("openai_api_key_last4"),
      openaiApiKeyValidatedAt: text("openai_api_key_validated_at"),
      // Gemini BYOK
      geminiApiKeyEncrypted: text("gemini_api_key_encrypted"),
      geminiApiKeyLast4: text("gemini_api_key_last4"),
      geminiApiKeyValidatedAt: text("gemini_api_key_validated_at"),
      createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull()
    });
    // ==========================================
    // PDF GENERATION PATH SETUP
    // ==========================================
    const path = require('path');
    const fs = require('fs');

    // Create the absolute path pointing to your 'generated-pdfs' folder
    const pdfOutputDir = path.join(process.cwd(), 'generated-pdfs');

    // Automatically build the folder if it isn't there so the app doesn't crash
    if (!fs.existsSync(pdfOutputDir)) {
      fs.mkdirSync(pdfOutputDir, { recursive: true });
    }
    // ==========================================
    appSecrets = sqliteTable("app_secrets", {
      key: text("key").primaryKey(),
      value: text("value").notNull(),
      createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull()
    });
    insertAppSecretSchema = createInsertSchema(appSecrets).omit({
      createdAt: true
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    policies = sqliteTable("policies", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      title: text("title").notNull(),
      type: text("type").notNull(),
      description: text("description"),
      content: text("content"),
      version: text("version").notNull().default("1.0"),
      status: text("status").notNull().default("draft"),
      frameworks: text("frameworks", { mode: "json" }).$type().default([]),
      createdBy: text("created_by").notNull(),
      approvedBy: text("approved_by"),
      organizationId: integer("organization_id").notNull().default(1),
      createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
      approvedAt: text("approved_at")
    });
    complianceFrameworks = sqliteTable("compliance_frameworks", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name").notNull(),
      displayName: text("display_name").notNull(),
      description: text("description"),
      completionPercentage: real("completion_percentage").default(0),
      status: text("status").notNull().default("in-progress"),
      lastUpdated: text("last_updated").default("CURRENT_TIMESTAMP").notNull()
    });
    complianceChecks = sqliteTable("compliance_checks", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      frameworkId: integer("framework_id").notNull().references(() => complianceFrameworks.id),
      checkName: text("check_name").notNull(),
      description: text("description"),
      status: text("status").notNull().default("pending"),
      evidence: text("evidence"),
      lastChecked: text("last_checked").default("CURRENT_TIMESTAMP").notNull()
    });
    vendors = sqliteTable("vendors", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name").notNull(),
      type: text("type").notNull(),
      riskLevel: text("risk_level").notNull().default("medium"),
      gdprCompliant: integer("gdpr_compliant", { mode: "boolean" }).default(false),
      soc2Compliant: integer("soc2_compliant", { mode: "boolean" }).default(false),
      aiActCompliant: integer("ai_act_compliant", { mode: "boolean" }).default(false),
      lastAssessment: text("last_assessment").default("CURRENT_TIMESTAMP").notNull(),
      notes: text("notes")
    });
    riskAssessments = sqliteTable("risk_assessments", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      title: text("title").notNull(),
      description: text("description"),
      riskScore: integer("risk_score").notNull(),
      riskLevel: text("risk_level").notNull(),
      category: text("category").notNull(),
      mitigationPlan: text("mitigation_plan"),
      status: text("status").notNull().default("open"),
      assignedTo: text("assigned_to"),
      dueDate: text("due_date"),
      // Tenant scoping
      organizationId: integer("organization_id").notNull().default(1),
      createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
      updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull()
    });
    auditReports = sqliteTable("audit_reports", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      title: text("title").notNull(),
      type: text("type").notNull(),
      framework: text("framework"),
      status: text("status").notNull().default("draft"),
      summary: text("summary"),
      findings: text("findings", { mode: "json" }).$type().default([]),
      recommendations: text("recommendations", { mode: "json" }).$type().default([]),
      generatedBy: text("generated_by").notNull(),
      // Tenant scoping
      organizationId: integer("organization_id").notNull().default(1),
      generatedAt: text("generated_at").default("CURRENT_TIMESTAMP").notNull(),
      filePath: text("file_path")
    });
    documentVersions = sqliteTable("document_versions", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      policyId: integer("policy_id").notNull().references(() => policies.id),
      version: text("version").notNull(),
      content: text("content").notNull(),
      changeNotes: text("change_notes"),
      createdBy: text("created_by").notNull(),
      createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull()
    });
    insertPolicySchema = createInsertSchema(policies).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      approvedAt: true
    });
    insertComplianceFrameworkSchema = createInsertSchema(complianceFrameworks).omit({
      id: true,
      lastUpdated: true
    });
    insertComplianceCheckSchema = createInsertSchema(complianceChecks).omit({
      id: true,
      lastChecked: true
    });
    insertVendorSchema = createInsertSchema(vendors).omit({
      id: true,
      lastAssessment: true
    });
    insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertAuditReportSchema = createInsertSchema(auditReports).omit({
      id: true,
      generatedAt: true
    });
    insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
      id: true,
      createdAt: true
    });
    insertOpenAiKeySchema = z.object({
      apiKey: z.string().min(1).regex(/^sk-[A-Za-z0-9_-]{10,}$/)
    });
    insertGeminiKeySchema = z.object({
      apiKey: z.string().min(1).regex(/^AIza[0-9A-Za-z_-]{10,}$/)
    });
    teamMembers = sqliteTable("team_members", {
      // Frontend uses string ids (e.g. "1", "2")
      id: text("id").primaryKey(),
      email: text("email").notNull().unique(),
      firstName: text("first_name").notNull(),
      lastName: text("last_name").notNull(),
      role: text("role").notNull(),
      status: text("status").notNull().default("active"),
      avatar: text("avatar"),
      joinedAt: text("joined_at").notNull().default("CURRENT_TIMESTAMP"),
      lastActive: text("last_active").notNull().default("CURRENT_TIMESTAMP"),
      permissions: text("permissions", { mode: "json" }).$type().default([]),
      assignedProjects: text("assigned_projects", { mode: "json" }).$type().default([])
    });
    insertTeamMemberSchema = createInsertSchema(teamMembers);
    workspaceSettings = sqliteTable("workspace_settings", {
      // Single-tenant “local pro” for now; store one row per organization.
      organizationId: integer("organization_id").primaryKey(),
      selectedFrameworks: text("selected_frameworks", { mode: "json" }).$type().default([]),
      selectedPolicyTitles: text("selected_policy_titles", { mode: "json" }).$type().default([]),
      updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP")
    });
    insertWorkspaceSettingsSchema = createInsertSchema(workspaceSettings).omit({
      updatedAt: true
    });
    verifiedLinks = sqliteTable("verified_links", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      token: text("token").notNull().unique(),
      // universal link token (e.g. used in /trust-center/:token)
      // Tenant scoping: who owns this trust-center link
      organizationId: integer("organization_id").notNull().default(1),
      supplierName: text("supplier_name").notNull(),
      supplierDomain: text("supplier_domain"),
      industry: text("industry"),
      companySize: text("company_size"),
      badges: text("badges", { mode: "json" }).$type().default([]),
      // documents can be titles + optional URLs (read-only)
      documents: text("documents", { mode: "json" }).$type().default([]),
      createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
      expiresAt: text("expires_at")
    });
    insertVerifiedLinkSchema = createInsertSchema(verifiedLinks).omit({
      id: true,
      createdAt: true
    });
    activityLogs = sqliteTable("activity_logs", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      // Actor
      userId: integer("user_id").notNull().references(() => users.id),
      // Tenant scoping
      organizationId: integer("organization_id").notNull().default(1),
      // What happened
      action: text("action").notNull(),
      // e.g. "policy_export", "audit_report_export", "risk_analyze", etc.
      entityType: text("entity_type").notNull(),
      // e.g. "policy" | "audit_report" | "risk_assessment"
      entityId: text("entity_id"),
      // store as string to allow different id types
      // Optional details
      metadata: text("metadata", { mode: "json" }).$type().default({}),
      createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull()
    });
    insertActivityLogSchema = createInsertSchema(activityLogs).omit({
      id: true,
      createdAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  sqlite: () => sqlite
});
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
function getDatabasePath() {
  if (process.env.REGREADY_DB_PATH) {
    return process.env.REGREADY_DB_PATH;
  }
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const isPackagedFolder = moduleDir.includes("win-unpacked") || moduleDir.includes("app.asar");
  if (isPackagedFolder) {
    const appDataFolder = path.join(process.env.APPDATA || "", "RegReady Local Pro");
    if (!fs.existsSync(appDataFolder)) {
      fs.mkdirSync(appDataFolder, { recursive: true });
    }
    return path.join(appDataFolder, "local.db");
  }
  return path.join(process.cwd(), "local.db");
}
var sqlitePath, sqlite, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    sqlitePath = getDatabasePath();
    sqlite = new Database(sqlitePath);
    db = drizzle(sqlite, { schema: schema_exports });
    console.log(`[RegReady Local Pro] Database initialized at: ${sqlitePath}`);
  }
});

// server/middleware/errorHandler.ts
import { ZodError } from "zod";
var errorHandler, notFoundHandler;
var init_errorHandler = __esm({
  "server/middleware/errorHandler.ts"() {
    "use strict";
    errorHandler = (err, req, res, _next) => {
      if (err instanceof ZodError) {
        const errorResponse2 = {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          path: req.url,
          details: err.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
            code: e.code
          }))
        };
        console.warn(`Validation error ${req.method} ${req.url}`, errorResponse2.details);
        res.status(400).json(errorResponse2);
        return;
      }
      const appErr = err;
      console.error(`Error ${appErr?.statusCode || 500}: ${appErr?.message}`, {
        method: req.method,
        url: req.url,
        userAgent: req.get("User-Agent"),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        stack: appErr?.stack
      });
      const isDevelopment = process.env.NODE_ENV === "development";
      const statusCode = appErr?.statusCode || 500;
      const message = appErr?.isOperational ? appErr?.message : "Internal server error";
      const errorResponse = {
        error: message,
        code: appErr?.code,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        path: req.url
      };
      if (isDevelopment && appErr?.stack) {
        errorResponse.stack = appErr.stack;
      }
      res.status(statusCode).json(errorResponse);
    };
    notFoundHandler = (req, res) => {
      res.status(404).json({
        error: "Resource not found",
        code: "NOT_FOUND",
        path: req.url,
        method: req.method,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
  }
});

// server/database-storage.ts
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
var DatabaseStorage;
var init_database_storage = __esm({
  "server/database-storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    DatabaseStorage = class {
      JWT_SECRET;
      constructor() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error("JWT_SECRET is not set. Ensure ensureAppSecrets() ran before DatabaseStorage initialization.");
        }
        this.JWT_SECRET = secret;
        this.initializeDefaultData();
      }
      async initializeDefaultData() {
        try {
          const existingFrameworks = await db.select().from(complianceFrameworks);
          if (existingFrameworks.length === 0) {
            const defaultFrameworks = [
              {
                name: "gdpr",
                displayName: "GDPR",
                description: "General Data Protection Regulation",
                status: "active",
                completionPercentage: 75
              },
              {
                name: "soc2",
                displayName: "SOC 2",
                description: "System and Organization Controls 2",
                status: "active",
                completionPercentage: 60
              },
              {
                name: "eu-ai-act",
                displayName: "EU AI Act",
                description: "European Union AI Act",
                status: "active",
                completionPercentage: 45
              }
            ];
            await db.insert(complianceFrameworks).values(defaultFrameworks);
            const gdprFramework = await db.select().from(complianceFrameworks).where(eq(complianceFrameworks.name, "gdpr"));
            const soc2Framework = await db.select().from(complianceFrameworks).where(eq(complianceFrameworks.name, "soc2"));
            const euAiActFramework = await db.select().from(complianceFrameworks).where(eq(complianceFrameworks.name, "eu-ai-act"));
            const gdprId = gdprFramework[0]?.id;
            const soc2Id = soc2Framework[0]?.id;
            const euAiActId = euAiActFramework[0]?.id;
            if (gdprId && soc2Id && euAiActId) {
              const defaultComplianceChecks = [
                // GDPR
                {
                  frameworkId: gdprId,
                  checkName: "GDPR Art. 30 \u2014 Records of Processing",
                  description: "Maintain records of processing activities (including purposes, categories of data subjects, recipients, and retention timelines) for compliance readiness.",
                  status: "pending",
                  evidence: ""
                },
                {
                  frameworkId: gdprId,
                  checkName: "GDPR Art. 32 \u2014 Security of Processing",
                  description: "Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including encryption and access controls.",
                  status: "pending",
                  evidence: ""
                },
                // SOC 2
                {
                  frameworkId: soc2Id,
                  checkName: "SOC 2 \u2014 Access Control & Monitoring",
                  description: "Implement logical access controls and monitoring to ensure only authorized users have access, with periodic review of access permissions.",
                  status: "pending",
                  evidence: ""
                },
                {
                  frameworkId: soc2Id,
                  checkName: "SOC 2 \u2014 Incident Response Readiness",
                  description: "Maintain incident response procedures including detection, triage, containment, eradication, and recovery, and evidence of testing/simulations.",
                  status: "pending",
                  evidence: ""
                },
                // EU AI Act
                {
                  frameworkId: euAiActId,
                  checkName: "EU AI Act \u2014 AI System Documentation",
                  description: "Maintain documentation for AI systems, including purpose, risk classification, and governance/oversight procedures.",
                  status: "pending",
                  evidence: ""
                }
              ];
              await db.insert(complianceChecks).values(defaultComplianceChecks);
            }
            const defaultVendors = [
              {
                name: "OpenAI",
                type: "ai-service",
                riskLevel: "low",
                gdprCompliant: true,
                soc2Compliant: true,
                aiActCompliant: false,
                notes: "AI model provider for policy generation"
              },
              {
                name: "Stripe",
                type: "payment-processing",
                riskLevel: "low",
                gdprCompliant: true,
                soc2Compliant: true,
                aiActCompliant: true,
                notes: "Payment processing for subscription billing"
              },
              {
                name: "Docker Hub",
                type: "infrastructure",
                riskLevel: "medium",
                gdprCompliant: true,
                soc2Compliant: true,
                aiActCompliant: true,
                notes: "Container registry for deployment"
              }
            ];
            await db.insert(vendors).values(defaultVendors);
            const defaultPolicies = [
              {
                title: "Privacy Policy",
                description: "Comprehensive privacy policy covering data collection, usage, and user rights",
                status: "approved",
                version: "2.1",
                content: "This privacy policy outlines how we collect, use, and protect your personal data...",
                category: "privacy",
                framework: "gdpr",
                approvedBy: "Legal Team",
                createdBy: "System",
                nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString()
              },
              {
                title: "Information Security Policy",
                description: "Guidelines for maintaining information security across the organization",
                status: "under-review",
                version: "1.0",
                content: "This policy establishes the framework for information security management...",
                category: "security",
                framework: "soc2",
                approvedBy: null,
                createdBy: "System",
                nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString()
              }
            ];
            const defaultRiskAssessments = [
              {
                title: "Data Breach Risk Assessment",
                description: "Assessment of potential data breach vulnerabilities",
                riskScore: 35,
                riskLevel: "medium",
                category: "security",
                mitigationPlan: "Implement additional encryption and access controls",
                status: "open",
                assignedTo: "Security Team",
                organizationId: 1,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString()
              }
            ];
            await db.insert(riskAssessments).values(defaultRiskAssessments);
          }
        } catch (error) {
          console.error("Error initializing default data:", error);
        }
      }
      // User operations
      async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user;
      }
      async getUserById(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      }
      async createUser(user) {
        const [newUser] = await db.insert(users).values(user).returning();
        return newUser;
      }
      async updateUser(id, user) {
        const [updatedUser] = await db.update(users).set({ ...user, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(users.id, id)).returning();
        return updatedUser;
      }
      async updateUserStripeInfo(id, stripeCustomerId, stripeSubscriptionId) {
        const [updatedUser] = await db.update(users).set({
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }).where(eq(users.id, id)).returning();
        return updatedUser;
      }
      async verifyPassword(email, password) {
        const user = await this.getUserByEmail(email);
        if (!user) return false;
        return bcrypt.compare(password, user.password);
      }
      async hashPassword(password) {
        return bcrypt.hash(password, 12);
      }
      generateAuthToken(userId) {
        return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: "30d" });
      }
      // Policy operations (tenant-scoped by organizationId)
      async getPolicies(organizationId) {
        const whereClause = organizationId ? eq(policies.organizationId, organizationId) : void 0;
        const query = whereClause ? db.select().from(policies).where(whereClause) : db.select().from(policies);
        return query;
      }
      async getPolicy(id, organizationId) {
        const whereClause = organizationId ? and(eq(policies.id, id), eq(policies.organizationId, organizationId)) : eq(policies.id, id);
        const [policy] = await db.select().from(policies).where(whereClause);
        return policy;
      }
      async createPolicy(policy) {
        const policyData = {
          type: policy.type,
          title: policy.title,
          description: policy.description || null,
          content: policy.content || null,
          version: policy.version || "1.0",
          status: policy.status || "draft",
          // Drizzle typing for JSON columns may surface as `Json[]`; force to the schema's string[] contract.
          frameworks: Array.isArray(policy.frameworks) ? policy.frameworks : [],
          createdBy: policy.createdBy,
          organizationId: policy.organizationId ?? 1,
          approvedBy: policy.approvedBy || null
        };
        const [newPolicy] = await db.insert(policies).values(policyData).returning();
        return newPolicy;
      }
      async updatePolicy(id, policy, organizationId) {
        const updateData = { updatedAt: /* @__PURE__ */ new Date() };
        if (policy.type) updateData.type = policy.type;
        if (policy.title) updateData.title = policy.title;
        if (policy.description !== void 0) updateData.description = policy.description;
        if (policy.content !== void 0) updateData.content = policy.content;
        if (policy.version) updateData.version = policy.version;
        if (policy.status) updateData.status = policy.status;
        if (policy.frameworks) updateData.frameworks = Array.isArray(policy.frameworks) ? policy.frameworks : [];
        if (policy.approvedBy !== void 0) updateData.approvedBy = policy.approvedBy;
        const whereClause = organizationId ? and(eq(policies.id, id), eq(policies.organizationId, organizationId)) : eq(policies.id, id);
        const [updatedPolicy] = await db.update(policies).set(updateData).where(whereClause).returning();
        return updatedPolicy;
      }
      async deletePolicy(id, organizationId) {
        const whereClause = organizationId ? and(eq(policies.id, id), eq(policies.organizationId, organizationId)) : eq(policies.id, id);
        await db.delete(policies).where(whereClause);
        return true;
      }
      // Compliance framework operations
      async getComplianceFrameworks() {
        return db.select().from(complianceFrameworks);
      }
      async getComplianceFramework(id) {
        const [framework] = await db.select().from(complianceFrameworks).where(eq(complianceFrameworks.id, id));
        return framework;
      }
      async createComplianceFramework(framework) {
        const [newFramework] = await db.insert(complianceFrameworks).values(framework).returning();
        return newFramework;
      }
      async updateComplianceFramework(id, framework) {
        const [updatedFramework] = await db.update(complianceFrameworks).set({ ...framework, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(complianceFrameworks.id, id)).returning();
        return updatedFramework;
      }
      // Compliance check operations
      async getComplianceChecks(frameworkId) {
        if (frameworkId) {
          return db.select().from(complianceChecks).where(eq(complianceChecks.frameworkId, frameworkId));
        }
        return db.select().from(complianceChecks);
      }
      async createComplianceCheck(check) {
        const [newCheck] = await db.insert(complianceChecks).values(check).returning();
        return newCheck;
      }
      async updateComplianceCheck(id, check) {
        const [updatedCheck] = await db.update(complianceChecks).set({ ...check, lastChecked: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(complianceChecks.id, id)).returning();
        return updatedCheck;
      }
      // Vendor operations
      async getVendors() {
        return db.select().from(vendors);
      }
      async getVendor(id) {
        const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
        return vendor;
      }
      async createVendor(vendor) {
        const [newVendor] = await db.insert(vendors).values(vendor).returning();
        return newVendor;
      }
      async updateVendor(id, vendor) {
        const [updatedVendor] = await db.update(vendors).set({ ...vendor, lastAssessment: (/* @__PURE__ */ new Date()).toISOString() }).where(eq(vendors.id, id)).returning();
        return updatedVendor;
      }
      async deleteVendor(id) {
        await db.delete(vendors).where(eq(vendors.id, id));
        return true;
      }
      // Risk assessment operations (tenant-scoped by organizationId)
      async getRiskAssessments(organizationId) {
        const whereClause = organizationId ? eq(riskAssessments.organizationId, organizationId) : void 0;
        return db.select().from(riskAssessments).where(whereClause);
      }
      async getRiskAssessment(id, organizationId) {
        const whereClause = organizationId ? and(eq(riskAssessments.id, id), eq(riskAssessments.organizationId, organizationId)) : eq(riskAssessments.id, id);
        const [assessment] = await db.select().from(riskAssessments).where(whereClause);
        return assessment;
      }
      async createRiskAssessment(assessment, organizationId) {
        const record = organizationId ? { ...assessment, organizationId } : assessment;
        const [newAssessment] = await db.insert(riskAssessments).values(record).returning();
        return newAssessment;
      }
      async updateRiskAssessment(id, assessment, organizationId) {
        const whereClause = organizationId ? and(eq(riskAssessments.id, id), eq(riskAssessments.organizationId, organizationId)) : eq(riskAssessments.id, id);
        const [updatedAssessment] = await db.update(riskAssessments).set({ ...assessment, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(whereClause).returning();
        return updatedAssessment;
      }
      // Audit report operations (tenant-scoped by organizationId)
      async getAuditReports(organizationId) {
        const whereClause = organizationId ? eq(auditReports.organizationId, organizationId) : void 0;
        return db.select().from(auditReports).where(whereClause);
      }
      async getAuditReport(id, organizationId) {
        const whereClause = organizationId ? and(eq(auditReports.id, id), eq(auditReports.organizationId, organizationId)) : eq(auditReports.id, id);
        const [report] = await db.select().from(auditReports).where(whereClause);
        return report;
      }
      async createAuditReport(report, organizationId) {
        const reportData = {
          title: report.title,
          type: report.type,
          framework: report.framework || null,
          status: report.status || "draft",
          summary: report.summary || null,
          // ensure types align with DB expectations (string[]). Cast as needed.
          findings: Array.isArray(report.findings) ? report.findings : [],
          recommendations: Array.isArray(report.recommendations) ? report.recommendations : [],
          generatedBy: report.generatedBy,
          filePath: report.filePath || null,
          organizationId: organizationId ?? report.organizationId ?? 1
        };
        const [newReport] = await db.insert(auditReports).values(reportData).returning();
        return newReport;
      }
      // Document version operations
      async getDocumentVersions(policyId) {
        return db.select().from(documentVersions).where(eq(documentVersions.policyId, policyId));
      }
      async createDocumentVersion(version) {
        const [newVersion] = await db.insert(documentVersions).values(version).returning();
        return newVersion;
      }
      // Trust Center / Verified Link operations (Phase 1)
      async createVerifiedLink(link) {
        const linkData = {
          ...link,
          // Drizzle typing for JSON columns may surface as `Json[]`; force to schema's string[] contract.
          badges: Array.isArray(link.badges) ? link.badges : [],
          documents: Array.isArray(link.documents) ? link.documents : []
        };
        const [newLink] = await db.insert(verifiedLinks).values(linkData).returning();
        return newLink;
      }
      async getVerifiedLinkByToken(token) {
        const [found] = await db.select().from(verifiedLinks).where(eq(verifiedLinks.token, token));
        return found;
      }
      // Activity / audit logging
      async createActivityLog(log3) {
        const logData = {
          userId: log3.userId,
          organizationId: log3.organizationId,
          action: log3.action,
          entityType: log3.entityType,
          entityId: log3.entityId ?? null,
          metadata: log3.metadata ?? {}
        };
        const [created] = await db.insert(activityLogs).values(logData).returning();
        return created;
      }
      // Dashboard data
      async getDashboardMetrics() {
        const frameworks = await this.getComplianceFrameworks();
        const totalPoliciesResult = await db.select({ count: sql`count(*)` }).from(policies);
        const riskAssessmentList = await this.getRiskAssessments();
        const complianceOverview = frameworks.map((framework) => ({
          framework: framework.displayName,
          percentage: Number(framework.completionPercentage ?? 0),
          status: Number(framework.completionPercentage ?? 0) >= 80 ? "compliant" : "non-compliant"
        }));
        const recentActivities = [
          { title: "Policy review completed", timestamp: (/* @__PURE__ */ new Date()).toISOString(), type: "policy" },
          { title: "GDPR compliance check", timestamp: (/* @__PURE__ */ new Date()).toISOString(), type: "compliance" }
        ];
        const avgRiskScore = riskAssessmentList.length > 0 ? riskAssessmentList.reduce((sum, risk) => sum + risk.riskScore, 0) / riskAssessmentList.length : 0;
        return {
          complianceOverview,
          recentActivities,
          riskScore: Math.round(avgRiskScore),
          totalPolicies: totalPoliciesResult[0].count,
          pendingReviews: 3
        };
      }
    };
  }
});

// server/storage.ts
var storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_database_storage();
    storage = new DatabaseStorage();
  }
});

// server/services/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
function buildUserGenerateContentPayload(text2) {
  return {
    contents: [{ role: "user", parts: [{ text: text2 }] }]
  };
}
function parseJsonFromModelText(text2) {
  const raw = (text2 || "").trim();
  const withoutFences = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start >= 0 && end >= 0 && end > start) {
    const jsonLike = withoutFences.slice(start, end + 1);
    return JSON.parse(jsonLike);
  }
  return JSON.parse(withoutFences);
}
function getGeminiKeyLast4(apiKey) {
  return apiKey.slice(-4);
}
async function listGeminiModelsViaRest(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    throw new Error(`Gemini models.list failed: ${res.status} ${res.statusText} ${text2}`.trim());
  }
  const body = await res.json();
  const names = Array.isArray(body.models) ? body.models.map((m) => m?.name).filter((n) => typeof n === "string") : [];
  return names.map((n) => n.split("/").pop() || n);
}
async function createGeminiModel(apiKey) {
  const resolvedApiKey = (apiKey || process.env.GEMINI_API_KEY)?.trim();
  if (!resolvedApiKey) {
    throw new Error("Gemini API key is not configured.");
  }
  const genAI = new GoogleGenerativeAI(resolvedApiKey);
  if (cachedGeminiModelId && cachedGeminiModelIdApiKey === resolvedApiKey) {
    return genAI.getGenerativeModel({ model: cachedGeminiModelId });
  }
  const preferred = ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest"];
  const available = await listGeminiModelsViaRest(resolvedApiKey);
  const picked = preferred.find((p) => available.includes(p)) ?? available[0];
  if (!picked) {
    throw new Error("Gemini models.list returned no models.");
  }
  cachedGeminiModelId = picked;
  cachedGeminiModelIdApiKey = resolvedApiKey;
  console.warn("[Gemini] Using model from REST list:", picked);
  return genAI.getGenerativeModel({ model: picked });
}
async function validateGeminiKey(apiKey) {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey.startsWith("AIza")) {
    return { valid: false, message: "Gemini API key must start with the 'AIza' prefix." };
  }
  try {
    await listGeminiModelsViaRest(trimmedKey);
    return {
      valid: true,
      message: "Gemini API key validated successfully.",
      last4: getGeminiKeyLast4(trimmedKey)
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    const lowered = details.toLowerCase();
    const looksInvalid = lowered.includes("api key not valid") || lowered.includes("api_key_invalid") || lowered.includes("invalid api key") || lowered.includes("key is not valid");
    return {
      valid: false,
      message: `Gemini API key rejected.${looksInvalid ? "" : " "} ${details}`
    };
  }
}
async function generatePolicy(request, apiKey) {
  const model = await createGeminiModel(apiKey);
  const frameworksText = request.frameworks.join(", ");
  const prompt = `You are a compliance expert. Generate a comprehensive ${request.type} policy document with the following requirements:

Title: ${request.title}
Description: ${request.description}
Compliance Frameworks: ${frameworksText}
${request.companyName ? `Company: ${request.companyName}` : ""}
${request.industry ? `Industry: ${request.industry}` : ""}

Please generate a detailed policy document that includes:
1. Executive summary
2. Scope and purpose
3. Definitions
4. Policy statements
5. Procedures and controls
6. Roles and responsibilities
7. Compliance requirements specific to ${frameworksText}
8. Review and update procedures
9. Enforcement and violations

Respond with JSON in this exact format:
{
  "title": "Policy Title",
  "content": "Full policy content with proper formatting and sections",
  "sections": ["Section 1", "Section 2", ...],
  "complianceNotes": {
    "gdpr": "GDPR-specific compliance notes if applicable",
    "soc2": "SOC 2-specific compliance notes if applicable",
    "ai-act": "EU AI Act-specific compliance notes if applicable"
  }
}`;
  try {
    const result = await model.generateContent(buildUserGenerateContentPayload(prompt));
    const text2 = result.response.text();
    const parsed = JSON.parse(text2 || "{}");
    return {
      title: parsed.title || request.title,
      content: parsed.content || "Policy content could not be generated. Please try again.",
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      complianceNotes: parsed.complianceNotes && typeof parsed.complianceNotes === "object" ? parsed.complianceNotes : {}
    };
  } catch (error) {
    console.error("Error generating policy (Gemini):", error);
    throw new Error("Failed to generate policy with Gemini. Please check your Gemini API key and try again.");
  }
}
async function analyzeComplianceRisk(description, frameworks, apiKey) {
  const model = await createGeminiModel(apiKey);
  const prompt = `Analyze the compliance risk for the following scenario:

Description: ${description}
Applicable Frameworks: ${frameworks.join(", ")}

Provide a risk analysis including:
1. Overall risk level (low, medium, high, critical)
2. Risk score (0-100)
3. Specific recommendations for risk mitigation
4. Framework-specific risk assessments

Respond with JSON in this exact format:
{
  "riskLevel": "low|medium|high|critical",
  "riskScore": number,
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "frameworkSpecificRisks": {
    "gdpr": "GDPR-specific risk assessment if applicable",
    "soc2": "SOC 2-specific risk assessment if applicable",
    "ai-act": "EU AI Act-specific risk assessment if applicable"
  }
}`;
  try {
    const result = await model.generateContent(buildUserGenerateContentPayload(prompt));
    const text2 = result.response.text();
    const parsed = parseJsonFromModelText(text2 || "{}");
    return {
      riskLevel: parsed.riskLevel || "medium",
      riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 50,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      frameworkSpecificRisks: parsed.frameworkSpecificRisks || {}
    };
  } catch (error) {
    console.error("Error analyzing compliance risk (Gemini):", error);
    throw new Error("Failed to analyze compliance risk with Gemini. Please check your Gemini API key and try again.");
  }
}
async function suggestRemediation(request, apiKey) {
  const model = await createGeminiModel(apiKey);
  const techStackText = (request.techStack ?? []).join(", ") || "unknown";
  const proTipAnswersText = request.proTipAnswers ? [
    request.proTipAnswers.auditBoundary ? `- Audit boundary: handlesPIIorPHI=${request.proTipAnswers.auditBoundary.handlesPIIorPHI ?? "unknown"}, hasPhysicalOffices=${String(request.proTipAnswers.auditBoundary.hasPhysicalOffices ?? "unknown")}` : `- Audit boundary: not provided`,
    request.proTipAnswers.evidencePipeline ? `- Evidence pipeline: primaryTicketingSystem=${request.proTipAnswers.evidencePipeline.primaryTicketingSystem ?? "unknown"}, whereSystemLogsAreCentralized=${request.proTipAnswers.evidencePipeline.whereSystemLogsAreCentralized ?? "unknown"}` : `- Evidence pipeline: not provided`,
    request.proTipAnswers.accessControl ? `- Access control: timeToRevokeOffboarding=${request.proTipAnswers.accessControl.timeToRevokeOffboarding ?? "unknown"}, customTimeToRevoke=${request.proTipAnswers.accessControl.customTimeToRevoke ?? "unknown"}, authMethod=${request.proTipAnswers.accessControl.authMethod ?? "unknown"}` : `- Access control: not provided`,
    request.proTipAnswers.infrastructureDetail ? `- Infrastructure detail: usesInfrastructureAsCode=${String(request.proTipAnswers.infrastructureDetail.usesInfrastructureAsCode ?? "unknown")}, dataRetentionPolicyDuration=${request.proTipAnswers.infrastructureDetail.dataRetentionPolicyDuration ?? "unknown"}` : `- Infrastructure detail: not provided`
  ].join("\n") : `- Pro-tip answers: not provided`;
  const prompt = `You are a compliance engineer. Your job is to fix a specific compliance gap by producing:
1) A short diff summary
2) A "suggested policy patch" (text to insert/replace) tailored to the user's organization and tools
3) Technical tasks with concrete checklists (actionable, implementation-ready)

Strictly follow the requested JSON output format.

Input:
- Framework control: ${request.frameworkControl}
- Industry: ${request.industry || "unknown"}
- Company size: ${request.companySize || "unknown"}
- User tech stack (tools/platforms): ${techStackText}
- Pro-tip answers (optional but strongly preferred):
${proTipAnswersText}
- Current policy text (may be incomplete):
${request.policyText}

Now generate the remediation.

Return JSON in this exact format:
{
  "diffSummary": "string",
  "suggestedPolicyPatch": "string",
  "technicalTasks": [
    { "title": "string", "checklist": ["string", "string"] }
  ]
}`;
  try {
    const result = await model.generateContent(buildUserGenerateContentPayload(prompt));
    const text2 = result.response.text();
    const parsed = JSON.parse(text2 || "{}");
    return {
      diffSummary: parsed.diffSummary || "No diff could be generated; please review the suggested patch text.",
      suggestedPolicyPatch: parsed.suggestedPolicyPatch || request.policyText || "",
      technicalTasks: Array.isArray(parsed.technicalTasks) ? parsed.technicalTasks.map((t) => ({
        title: t?.title || "Technical task",
        checklist: Array.isArray(t?.checklist) ? t.checklist.map(String) : []
      })) : []
    };
  } catch (error) {
    console.error("Error suggesting remediation (Gemini):", error);
    throw new Error("Failed to suggest remediation with Gemini. Please check your Gemini API key and try again.");
  }
}
var cachedGeminiModelId, cachedGeminiModelIdApiKey;
var init_gemini = __esm({
  "server/services/gemini.ts"() {
    "use strict";
    cachedGeminiModelId = null;
    cachedGeminiModelIdApiKey = null;
  }
});

// encryption.js
import crypto3 from "crypto";
function decrypt(text2) {
  try {
    const parts = text2.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted text format.");
    }
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encryptedText = parts[2];
    const decipher = crypto3.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return null;
  }
}
var ALGORITHM, ENCRYPTION_KEY;
var init_encryption = __esm({
  "encryption.js"() {
    "use strict";
    ALGORITHM = "aes-256-gcm";
    ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
      throw new Error("ENCRYPTION_KEY environment variable is not set or is not 32 characters long.");
    }
  }
});

// server/services/byokCrypto.ts
function decryptByokKey(storedCipherText) {
  const trimmed = storedCipherText?.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  const looksLikeEncryptedFormat = parts.length === 3;
  if (!looksLikeEncryptedFormat) {
    return trimmed;
  }
  const decrypted = decrypt(trimmed);
  if (decrypted) return decrypted;
  return trimmed;
}
var init_byokCrypto = __esm({
  "server/services/byokCrypto.ts"() {
    "use strict";
    init_encryption();
  }
});

// server/services/llmService.ts
function getGeminiApiKeyForUser(user) {
  const stored = user.geminiApiKeyEncrypted;
  if (!stored) return void 0;
  const decrypted = decryptByokKey(stored);
  return decrypted ?? void 0;
}
async function validateLLMKey(_provider, apiKey) {
  return validateGeminiKey(apiKey);
}
async function generatePolicy2(request, user) {
  const apiKey = user ? getGeminiApiKeyForUser(user) : void 0;
  return generatePolicy(request, apiKey);
}
async function analyzeComplianceRisk2(description, frameworks, user) {
  const apiKey = user ? getGeminiApiKeyForUser(user) : void 0;
  return analyzeComplianceRisk(description, frameworks, apiKey);
}
async function suggestRemediation2(request, user) {
  const apiKey = user ? getGeminiApiKeyForUser(user) : void 0;
  return suggestRemediation(request, apiKey);
}
var init_llmService = __esm({
  "server/services/llmService.ts"() {
    "use strict";
    init_gemini();
    init_byokCrypto();
  }
});

// server/services/pdf-generator.ts
import PDFDocument from "pdfkit";
import fs2 from "fs";
import path2 from "path";
async function generatePolicyPDF(policy) {
  const doc = new PDFDocument();
  const filename = `policy-${policy.id}-${Date.now()}.pdf`;
  const filepath = path2.join(process.cwd(), "generated-pdfs", filename);
  const dir = path2.dirname(filepath);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  const stream = fs2.createWriteStream(filepath);
  doc.pipe(stream);
  doc.fontSize(20).text("RegReady Compliance Platform", { align: "center" });
  doc.moveDown();
  doc.fontSize(18).text(policy.title, { align: "center" });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Policy Type: ${policy.type}`);
  doc.text(`Version: ${policy.version}`);
  doc.text(`Status: ${policy.status}`);
  doc.text(`Created: ${new Date(policy.createdAt).toLocaleDateString()}`);
  doc.text(`Last Updated: ${new Date(policy.updatedAt).toLocaleDateString()}`);
  if (policy.frameworks && policy.frameworks.length > 0) {
    doc.text(`Compliance Frameworks: ${policy.frameworks.join(", ")}`);
  }
  doc.moveDown();
  if (policy.description) {
    doc.fontSize(14).text("Description", { underline: true });
    doc.fontSize(12).text(policy.description);
    doc.moveDown();
  }
  if (policy.content) {
    doc.fontSize(14).text("Policy Content", { underline: true });
    doc.fontSize(12).text(policy.content);
  }
  doc.fontSize(10).text(
    `Generated by RegReady on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
    50,
    doc.page.height - 50,
    { align: "center" }
  );
  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filepath));
    stream.on("error", reject);
  });
}
async function generateComplianceReportPDF(params) {
  const doc = new PDFDocument();
  const filename = `compliance-report-${params.templateId}-${Date.now()}.pdf`;
  const filepath = path2.join(process.cwd(), "generated-pdfs", filename);
  const dir = path2.dirname(filepath);
  if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
  const stream = fs2.createWriteStream(filepath);
  doc.pipe(stream);
  doc.fontSize(20).text("RegReady Compliance Platform", { align: "center" });
  doc.moveDown();
  doc.fontSize(18).text(params.title, { align: "center" });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Template: ${params.templateId}`);
  doc.text(`Format: ${params.format}`);
  doc.text(`Generated: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`);
  doc.text(`Included certification pages: ${params.includeCertification ? "Yes" : "No"}`);
  doc.moveDown();
  doc.fontSize(14).text("Framework Coverage", { underline: true });
  doc.fontSize(12);
  if (params.frameworks.length > 0) doc.text(`Frameworks: ${params.frameworks.join(", ")}`);
  else doc.text("Frameworks: (none)");
  doc.moveDown();
  const sections = Array.isArray(params.sections) && params.sections.length > 0 ? params.sections : ["Executive Summary", "Compliance Status", "Recommendations"];
  doc.fontSize(14).text("Report Sections", { underline: true });
  doc.fontSize(12);
  sections.forEach((s) => doc.text(`\u2022 ${s}`));
  doc.moveDown();
  const approvedCount = params.policies.filter((p) => p.status === "approved" || p.status === "final").length;
  const pendingCount = params.policies.filter((p) => p.status === "under-review").length;
  const draftCount = params.policies.filter((p) => p.status === "draft").length;
  doc.fontSize(14).text("Executive Summary (DB-derived)", { underline: true });
  doc.fontSize(12);
  doc.text(`Policies found: ${params.policies.length}`);
  doc.text(`Approved/Final: ${approvedCount}`);
  doc.text(`Under review: ${pendingCount}`);
  doc.text(`Draft: ${draftCount}`);
  doc.moveDown();
  doc.fontSize(14).text("Compliance Evidence (Policies)", { underline: true });
  doc.fontSize(12);
  if (params.policies.length === 0) {
    doc.text("No policy evidence found in the database for the selected workspace/frameworks.");
  } else {
    params.policies.slice(0, 30).forEach((p, idx) => {
      doc.fontSize(12).text(`${idx + 1}. ${p.title}`);
      doc.fontSize(10).text(`Type: ${p.type} \u2022 Version: ${p.version} \u2022 Status: ${p.status}`);
      if (p.description) doc.fontSize(10).text(`Description: ${p.description}`);
      if (p.frameworks?.length) doc.fontSize(10).text(`Frameworks: ${p.frameworks.join(", ")}`);
      doc.moveDown(0.3);
    });
  }
  doc.moveDown();
  if (params.includeCertification) {
    doc.fontSize(14).text("Compliance Certification Pages", { underline: true });
    doc.fontSize(12);
    doc.text("Certification details would be rendered here using signed attestations & evidence bundles.");
    doc.text("For now, this section is generated based on DB evidence counts.");
    doc.moveDown();
  }
  doc.fontSize(10).text(
    `Generated by RegReady on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
    50,
    doc.page.height - 50,
    { align: "center" }
  );
  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filepath));
    stream.on("error", reject);
  });
}
async function generateRiskAssessmentPDF(params) {
  const doc = new PDFDocument();
  const filename = `risk-assessment-${Date.now()}.pdf`;
  const filepath = path2.join(process.cwd(), "generated-pdfs", filename);
  const dir = path2.dirname(filepath);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  const stream = fs2.createWriteStream(filepath);
  doc.pipe(stream);
  doc.fontSize(20).text("RegReady Compliance Platform", { align: "center" });
  doc.moveDown();
  doc.fontSize(18).text("Risk Assessment Report", { align: "center" });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Generated: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`);
  doc.text(`Risk Level: ${params.riskLevel}`);
  doc.text(`Risk Score: ${params.riskScore}/100`);
  if (params.frameworks?.length) {
    doc.text(`Frameworks: ${params.frameworks.join(", ")}`);
  }
  doc.moveDown();
  doc.fontSize(14).text("Scenario", { underline: true });
  doc.fontSize(12).text(params.description || "(none provided)");
  doc.moveDown();
  doc.fontSize(14).text("Recommendations", { underline: true });
  doc.fontSize(12);
  if (Array.isArray(params.recommendations) && params.recommendations.length > 0) {
    params.recommendations.forEach((rec, idx) => {
      doc.text(`${idx + 1}. ${rec}`);
    });
  } else {
    doc.text("No recommendations returned.");
  }
  doc.moveDown();
  doc.fontSize(14).text("Framework-specific risks", { underline: true });
  doc.fontSize(12);
  const entries = Object.entries(params.frameworkSpecificRisks || {});
  if (entries.length > 0) {
    entries.forEach(([key, value]) => {
      doc.fontSize(12).text(`${key.toString().toUpperCase()}:`);
      doc.fontSize(12).text(value || "");
      doc.moveDown(0.5);
    });
  } else {
    doc.text("No framework-specific risks returned.");
  }
  doc.fontSize(10).text(
    `Generated by RegReady on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
    50,
    doc.page.height - 50,
    { align: "center" }
  );
  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(filepath));
    stream.on("error", reject);
  });
}
var init_pdf_generator = __esm({
  "server/services/pdf-generator.ts"() {
    "use strict";
  }
});

// server/middleware/auth.ts
import jwt2 from "jsonwebtoken";
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Ensure ensureAppSecrets() ran before routes.");
  }
  return secret;
}
var requireAuth;
var init_auth = __esm({
  "server/middleware/auth.ts"() {
    "use strict";
    init_storage();
    requireAuth = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({
            error: "Authentication required",
            redirect: "/login"
          });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (!token) {
          return res.status(401).json({
            error: "Authentication required",
            redirect: "/login"
          });
        }
        const decoded = jwt2.verify(token, getJwtSecret());
        const userId = typeof decoded?.userId === "number" ? decoded.userId : void 0;
        if (!userId) {
          return res.status(401).json({
            error: "Invalid authentication token",
            redirect: "/login"
          });
        }
        const user = await storage.getUserById(userId);
        if (!user) {
          return res.status(401).json({
            error: "Invalid authentication token",
            redirect: "/login"
          });
        }
        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          organizationId: user.organizationId,
          role: user.role,
          subscriptionTier: "pro",
          subscriptionStatus: "active"
        };
        next();
      } catch (_err) {
        return res.status(401).json({
          error: "Invalid authentication",
          redirect: "/login"
        });
      }
    };
  }
});

// server/routes.ts
var routes_exports = {};
__export(routes_exports, {
  registerRoutes: () => registerRoutes
});
import { createServer } from "http";
import { z as z2 } from "zod";
import crypto4 from "crypto";
import path3 from "path";
function looksLikeBcryptHash(value) {
  if (!value) return false;
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$") || value.startsWith("$2x$");
}
async function registerRoutes(app2) {
  app2.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const schema = z2.object({
        email: z2.string().email(),
        password: z2.string().min(1),
        username: z2.string().min(1)
      });
      const { email, password, username } = schema.parse(req.body);
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        const storedPassword = existing.password;
        if (!storedPassword) {
          return res.status(401).json({ error: "Invalid credentials", redirect: "/login" });
        }
        const isBcrypt = looksLikeBcryptHash(storedPassword);
        let valid = false;
        if (isBcrypt) {
          valid = await storage.verifyPassword(email, password);
        } else {
          valid = storedPassword === password;
          if (valid) {
            const hashed = await storage.hashPassword(password);
            await storage.updateUser(existing.id, { password: hashed });
          }
        }
        if (!valid) {
          return res.status(401).json({ error: "Invalid credentials", redirect: "/login" });
        }
      } else {
        const hashed = await storage.hashPassword(password);
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
          geminiApiKeyValidatedAt: null
        });
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
          subscriptionStatus: "active"
        }
      });
    })
  );
  app2.get(
    "/api/auth/user",
    requireAuth,
    asyncHandler(async (req, res) => {
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
        createdAt: user.createdAt ?? null,
        updatedAt: user.updatedAt ?? null
      });
    })
  );
  app2.get(
    "/api/dashboard/metrics",
    requireAuth,
    asyncHandler(async (req, res) => {
      const orgId = req.user.organizationId;
      const frameworks = await storage.getComplianceFrameworks();
      const policiesList = await storage.getPolicies(orgId);
      const riskAssessments2 = await storage.getRiskAssessments(orgId);
      const complianceOverview = frameworks.map((framework) => ({
        framework: framework.displayName,
        percentage: Number(framework.completionPercentage ?? 0),
        status: Number(framework.completionPercentage ?? 0) >= 80 ? "compliant" : "non-compliant"
      }));
      const recentActivities = [
        { title: "Policy review completed", timestamp: (/* @__PURE__ */ new Date()).toISOString(), type: "policy" },
        { title: "Compliance check queued", timestamp: (/* @__PURE__ */ new Date()).toISOString(), type: "compliance" }
      ];
      const avgRiskScore = riskAssessments2.length > 0 ? riskAssessments2.reduce((sum, r) => sum + r.riskScore, 0) / riskAssessments2.length : 0;
      const pendingReviews = policiesList.filter((p) => p.status === "under-review").length;
      res.json({
        complianceOverview,
        recentActivities,
        riskScore: Math.round(avgRiskScore),
        totalPolicies: policiesList.length,
        pendingReviews
      });
    })
  );
  app2.get(
    "/api/dashboard/analytics",
    requireAuth,
    asyncHandler(async (req, res) => {
      const orgId = req.user.organizationId;
      const frameworks = await storage.getComplianceFrameworks();
      const policiesList = await storage.getPolicies(orgId);
      const riskAssessments2 = await storage.getRiskAssessments(orgId);
      const frameworkCompletionValues = frameworks.map((f) => {
        if (typeof f.completionPercentage === "number") return f.completionPercentage;
        const parsed = parseFloat(String(f.completionPercentage ?? "0"));
        return Number.isFinite(parsed) ? parsed : 0;
      });
      const frameworksAvgCompletion = frameworkCompletionValues.length > 0 ? frameworkCompletionValues.reduce((sum, v) => sum + v, 0) / frameworkCompletionValues.length : 0;
      const currentCompliance = Math.round(frameworksAvgCompletion);
      const previousCompliance = Math.max(0, Math.round(currentCompliance - Math.min(10, riskAssessments2.length * 2)));
      const trend = currentCompliance > previousCompliance ? "up" : currentCompliance < previousCompliance ? "down" : "stable";
      const totalPolicies = policiesList.length;
      const approved = policiesList.filter((p) => p.status === "approved" || p.status === "final").length;
      const pending = policiesList.filter((p) => p.status === "under-review").length;
      const nowMs = Date.now();
      const overdueDaysThreshold = 45;
      const overdue = policiesList.filter((p) => {
        const createdMs = p.createdAt ? Date.parse(p.createdAt) : NaN;
        return Number.isFinite(createdMs) && nowMs - createdMs > overdueDaysThreshold * 24 * 60 * 60 * 1e3 && p.status !== "approved" && p.status !== "final";
      }).length;
      const { documentCount } = await (async () => {
        const { documentVersions: documentVersions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { sql: sql2 } = await import("drizzle-orm");
        const [row] = await db2.select({ documentCount: sql2`count(*)` }).from(documentVersions2);
        return { documentCount: row?.documentCount ?? 0 };
      })();
      const { activeUsers } = await (async () => {
        const { users: users2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { sql: sql2 } = await import("drizzle-orm");
        const [row] = await db2.select({ activeUsers: sql2`count(*)` }).from(users2);
        return { activeUsers: row?.activeUsers ?? 0 };
      })();
      const avgResponseTimeDays = (() => {
        const durations = [];
        for (const p of policiesList) {
          const createdMs = p.createdAt ? Date.parse(p.createdAt) : NaN;
          const endIso = p.updatedAt || p.approvedAt || null;
          const endMs = endIso ? Date.parse(endIso) : NaN;
          if (!Number.isFinite(createdMs) || !Number.isFinite(endMs)) continue;
          const diffDays = (endMs - createdMs) / (1e3 * 60 * 60 * 24);
          if (diffDays > 0) durations.push(diffDays);
        }
        const avg = durations.length > 0 ? durations.reduce((s, v) => s + v, 0) / durations.length : 0;
        return `${avg.toFixed(1)} days`;
      })();
      const teamActivity = {
        activeUsers,
        documentsCreated: documentCount,
        reviewsCompleted: approved,
        avgResponseTime: avgResponseTimeDays
      };
      const frameworkProgress = frameworks.map((f) => {
        const current = typeof f.completionPercentage === "number" ? f.completionPercentage : parseFloat(String(f.completionPercentage ?? "0"));
        const safeCurrent = Number.isFinite(current) ? current : 0;
        const daysUntilDeadline = Math.max(7, Math.round((100 - safeCurrent) * 3));
        const deadline = new Date(Date.now() + daysUntilDeadline * 24 * 60 * 60 * 1e3).toISOString();
        return {
          name: f.displayName,
          current: safeCurrent,
          target: 100,
          deadline
        };
      });
      const lastSixMonths = (() => {
        const d = /* @__PURE__ */ new Date();
        const months = [];
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
        const risksInMonth = riskAssessments2.filter((r) => {
          const createdAt = r.createdAt;
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
          risks: risksInMonth.length
        };
      });
      res.json({
        complianceScores: { current: currentCompliance, previous: previousCompliance, trend },
        policyMetrics: { total: totalPolicies, approved, pending, overdue },
        teamActivity,
        frameworkProgress,
        monthlyTrends
      });
    })
  );
  app2.get(
    "/api/policies",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(await storage.getPolicies(req.user.organizationId));
    })
  );
  app2.get(
    "/api/policies/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const policyId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const policy = await storage.getPolicy(policyId, req.user.organizationId);
      if (!policy) return res.status(404).json({ message: "Policy not found" });
      res.json(policy);
    })
  );
  app2.put(
    "/api/policies/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const updatedPolicyId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const updatedPolicy = await storage.updatePolicy(updatedPolicyId, req.body, req.user.organizationId);
      if (!updatedPolicy) return res.status(404).json({ message: "Policy not found" });
      res.json(updatedPolicy);
    })
  );
  app2.post(
    "/api/policies",
    requireAuth,
    asyncHandler(async (req, res) => {
      const policy = await storage.createPolicy({
        ...req.body,
        createdBy: String(req.user.id),
        organizationId: req.user.organizationId
      });
      res.status(201).json(policy);
    })
  );
  app2.get(
    "/api/user/settings/api-key",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await storage.getUserById(req.user.id);
      const provider = "gemini";
      res.json({
        provider,
        hasApiKey: Boolean(user?.geminiApiKeyEncrypted),
        last4: user?.geminiApiKeyLast4 || null,
        validatedAt: user?.geminiApiKeyValidatedAt || null
      });
    })
  );
  app2.get(
    "/api/user/settings/api-key/validate",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await storage.getUserById(req.user.id);
      const provider = "gemini";
      const storedApiKey = provider === "gemini" ? user?.geminiApiKeyEncrypted || void 0 : user?.openaiApiKeyEncrypted || void 0;
      const apiKey = storedApiKey ? decryptByokKey(storedApiKey) ?? void 0 : void 0;
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
          message: "No API key saved for the selected provider."
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
        message: validation.message
      });
    })
  );
  app2.post(
    "/api/user/settings/api-key",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { apiKey } = llmKeySchema.parse(req.body);
      const existingUser = await storage.getUserById(req.user.id);
      const provider = "gemini";
      const validation = await validateLLMKey(provider, apiKey);
      if (!validation.valid) {
        return res.status(400).json(validation);
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const updateData = {
        llmProvider: "gemini",
        geminiApiKeyEncrypted: apiKey,
        geminiApiKeyLast4: validation.last4,
        geminiApiKeyValidatedAt: nowIso
      };
      const updatedUser = existingUser ? await storage.updateUser(req.user.id, updateData) : await storage.createUser({
        email: "pro@regready.local",
        password: "placeholder-password",
        username: "Local Admin",
        role: "admin",
        organizationId: req.user.organizationId,
        ...updateData
      });
      res.json({
        valid: true,
        message: "Gemini API key saved and verified.",
        last4: validation.last4,
        hasApiKey: Boolean(updatedUser?.geminiApiKeyEncrypted)
      });
    })
  );
  app2.post(
    "/api/user/settings/api-key/test",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { apiKey } = llmKeySchema.parse(req.body);
      const provider = "gemini";
      const validation = await validateLLMKey(provider, apiKey);
      if (!validation.valid) {
        return res.status(400).json(validation);
      }
      res.json({
        provider,
        valid: true,
        message: validation.message,
        last4: validation.last4,
        validatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    })
  );
  app2.post(
    "/api/user/settings/api-key/validate",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { apiKey } = llmKeySchema.parse(req.body);
      const provider = "gemini";
      const validation = await validateLLMKey(provider, apiKey);
      if (!validation.valid) {
        return res.status(400).json(validation);
      }
      res.json({
        provider,
        valid: true,
        message: validation.message,
        last4: validation.last4,
        validatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    })
  );
  app2.post("/api/policies/generate", requireAuth, asyncHandler(async (req, res) => {
    const schema = z2.object({
      title: z2.string().min(1),
      type: z2.string().min(1),
      description: z2.string().min(1),
      frameworks: z2.array(z2.string())
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
        frameworks: validatedData.frameworks
      }
    });
    const generatedPolicy = await generatePolicy2(validatedData, user);
    res.json(generatedPolicy);
  }));
  app2.get(
    "/api/audit-reports",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json(await storage.getAuditReports(req.user.organizationId));
    })
  );
  app2.post(
    "/api/audit-reports",
    requireAuth,
    asyncHandler(async (req, res) => {
      const report = await storage.createAuditReport(req.body, req.user.organizationId);
      res.status(201).json(report);
    })
  );
  app2.post(
    "/api/audit-reports/:id/export",
    requireAuth,
    asyncHandler(async (req, res) => {
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const report = await storage.getAuditReport(id, req.user.organizationId);
      if (!report) return res.status(404).json({ message: "Audit report not found" });
      res.json({ ok: true, reportId: report.id, downloadUrl: `/api/audit-reports/${report.id}/export` });
    })
  );
  app2.post("/api/compliance-reports/export", requireAuth, asyncHandler(async (req, res) => {
    const schema = z2.object({
      title: z2.string().min(1),
      templateId: z2.string().min(1),
      format: z2.enum(["pdf", "docx", "excel"]).default("pdf"),
      includeCertification: z2.boolean().default(false),
      // Template/framework display names coming from the frontend (e.g. "GDPR", "SOC 2", "EU AI Act")
      frameworks: z2.array(z2.string()).default([]),
      // Optional for layout only
      sections: z2.array(z2.string()).default([])
    });
    const validated = schema.parse(req.body);
    const orgId = req.user.organizationId;
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const {
      complianceFrameworks: complianceFrameworks2,
      policies: policies2
    } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const { and: and2, eq: eq2, inArray, or } = await import("drizzle-orm");
    const frameworkRows = await db2.select().from(complianceFrameworks2);
    const selectedFrameworkNames = (() => {
      if (validated.frameworks.length === 0) return [];
      const normalized = new Set(validated.frameworks.map((s) => s.trim().toLowerCase()));
      return frameworkRows.filter((f) => normalized.has(String(f.displayName).trim().toLowerCase()) || normalized.has(String(f.name).trim().toLowerCase())).map((f) => f.name);
    })();
    const policyFilter = (() => {
      return db2.select().from(policies2).where(eq2(policies2.organizationId, orgId));
    })();
    const allPolicies = await policyFilter;
    const filteredPolicies = selectedFrameworkNames.length > 0 ? allPolicies.filter((p) => Array.isArray(p.frameworks) && p.frameworks.some((fw) => selectedFrameworkNames.includes(fw))) : allPolicies;
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
        includeCertification: validated.includeCertification
      }
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
        frameworks: p.frameworks ?? []
      })),
      sections: validated.sections
    });
    res.download(filepath);
  }));
  app2.get(
    "/api/compliance-frameworks",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(await storage.getComplianceFrameworks());
    })
  );
  app2.get(
    "/api/vendors",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { vendors: vendors2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const rows = await db2.select().from(vendors2);
      res.json(rows);
    })
  );
  app2.put(
    "/api/vendors/:id/dpa",
    requireAuth,
    asyncHandler(async (req, res) => {
      const schema = z2.object({ dpaText: z2.string().min(1, "DPA text is required") });
      const { dpaText } = schema.parse(req.body);
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const updated = await storage.updateVendor(id, { notes: dpaText });
      if (!updated) return res.status(404).json({ message: "Vendor not found" });
      res.json({ ok: true, vendorId: updated.id, notesSaved: Boolean(updated.notes) });
    })
  );
  app2.get(
    "/api/team/members",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { teamMembers: teamMembers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const rows = await db2.select().from(teamMembers2);
      res.json(rows);
    })
  );
  app2.get(
    "/api/team/invites",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(mockTeamInvites);
    })
  );
  app2.post(
    "/api/team/invite",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.status(201).json({
        id: `inv_${Date.now()}`,
        ...req.body,
        invitedBy: "Admin User",
        invitedAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3).toISOString(),
        status: "pending"
      });
    })
  );
  app2.patch(
    "/api/team/members/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ id: req.params.id, ...req.body });
    })
  );
  app2.delete(
    "/api/team/members/:id",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json({ ok: true });
    })
  );
  app2.get(
    "/api/workspace/activities",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(mockWorkspaceActivities);
    })
  );
  app2.get(
    "/api/workspace/comments",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(mockWorkspaceComments);
    })
  );
  app2.get(
    "/api/workspace/tasks",
    requireAuth,
    asyncHandler(async (_req, res) => {
      res.json(mockWorkspaceTasks);
    })
  );
  app2.post(
    "/api/workspace/comments",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.status(201).json({
        id: `comment_${Date.now()}`,
        ...req.body,
        user: { id: "1", name: "Admin User" },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    })
  );
  app2.patch(
    "/api/workspace/tasks/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ id: req.params.id, ...req.body });
    })
  );
  app2.get("/api/recommendations", requireAuth, asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { eq: eq2 } = await import("drizzle-orm");
    const { workspaceSettings: workspaceSettings2, complianceFrameworks: complianceFrameworks2, complianceChecks: complianceChecks2, policies: policies2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const workspaceRows = await db2.select().from(workspaceSettings2).where(eq2(workspaceSettings2.organizationId, orgId));
    const selectedFrameworkNames = workspaceRows[0]?.selectedFrameworks && workspaceRows[0].selectedFrameworks.length > 0 ? workspaceRows[0].selectedFrameworks : [];
    const allFrameworkRows = await db2.select().from(complianceFrameworks2);
    const frameworksToUse = selectedFrameworkNames.length > 0 ? allFrameworkRows.filter((f) => selectedFrameworkNames.includes(f.name)) : allFrameworkRows;
    const allPolicies = await db2.select().from(policies2).where(eq2(policies2.organizationId, orgId));
    const keywordGroups = [
      {
        match: (n) => /access control/i.test(n) || /access/i.test(n),
        keywords: ["access control", "access-management", "privileged access", "pam", "mfa", "role-based access", "rbac"],
        recommendation: (framework) => ({
          category: "security",
          priority: "high",
          impact: 90,
          effort: 45,
          timeline: "3-4 weeks",
          riskReduction: 50
        })
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
          riskReduction: 30
        })
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
          riskReduction: 40
        })
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
          riskReduction: 38
        })
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
          riskReduction: 35
        })
      }
    ];
    const recommendations = [];
    for (const framework of frameworksToUse) {
      const checks = await db2.select().from(complianceChecks2).where(eq2(complianceChecks2.frameworkId, framework.id));
      for (const check of checks) {
        const matchingGroup = keywordGroups.find((g) => g.match(check.checkName)) ?? keywordGroups.find((g) => /.+/i.test(check.checkName)) ?? null;
        const keywords = matchingGroup?.keywords ?? [];
        const hasEvidence = allPolicies.filter((p) => Array.isArray(p.frameworks) && p.frameworks.includes(framework.name)).some((p) => {
          const haystack = `${p.title ?? ""}
${p.description ?? ""}
${p.content ?? ""}`.toLowerCase();
          return keywords.length > 0 ? keywords.some((k) => haystack.includes(k.toLowerCase())) : false;
        }) ?? false;
        if (hasEvidence) continue;
        const recMeta = matchingGroup?.recommendation(framework.displayName) ?? {
          category: "compliance",
          priority: "medium",
          impact: 60,
          effort: 50,
          timeline: "3-5 weeks",
          riskReduction: 25
        };
        const recommendationId = `${framework.name}::${check.id}`;
        const implementationSteps = keywords.length > 0 ? [
          `Review the requirement: ${check.checkName}`,
          `Create/Update a policy draft that addresses: ${keywords.slice(0, 3).join(", ")}`,
          `Add supporting content (procedures, scope, and enforcement details)`,
          `Submit for approval and track progress in this workspace`
        ] : [
          `Review the requirement: ${check.checkName}`,
          `Create/Update a policy draft aligned with the requirement`,
          `Include evidence-ready content for audit-readiness`
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
          riskReduction: recMeta.riskReduction
        });
      }
    }
    const staleThresholdMs = 365 * 24 * 60 * 60 * 1e3;
    const nowMs = Date.now();
    const staleRecommendationByFramework = /* @__PURE__ */ new Map();
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
        description: `One or more policies linked to ${framework.displayName} have not been reviewed in over 365 days. Flag them for Annual Review and refresh evidence.`,
        priority: stalePolicies.length >= 5 ? "high" : "medium",
        category: "governance",
        impact: stalePolicies.length >= 5 ? 85 : 70,
        effort: stalePolicies.length >= 5 ? 60 : 45,
        frameworks: [framework.displayName],
        implementationSteps: [
          `Review stale policies for ${framework.displayName}: ${topPolicyTitles.join(", ") || "(unknown titles)"}`,
          "Confirm ownership and review scope (update procedures, controls, and enforcement evidence)",
          "Update the policy content and set a new review date",
          "Submit updated policies for approval to restore evidence freshness"
        ],
        timeline: stalePolicies.length >= 5 ? "4-6 weeks" : "2-4 weeks",
        riskReduction: stalePolicies.length >= 5 ? 45 : 30
      });
    }
    res.json(recommendations);
  }));
  app2.post(
    "/api/recommendations/:id/implement",
    requireAuth,
    asyncHandler(async (req, res) => {
      res.json({ ok: true, recommendationId: req.params.id, organizationId: req.user.organizationId });
    })
  );
  app2.post("/api/risk-assessments/analyze", requireAuth, asyncHandler(async (req, res) => {
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
        frameworks
      }
    });
    const riskAnalysis = await analyzeComplianceRisk2(description, frameworks, user);
    res.json(riskAnalysis);
  }));
  app2.post("/api/risk-assessments/export", requireAuth, asyncHandler(async (req, res) => {
    const schema = z2.object({
      description: z2.string().min(1),
      frameworks: z2.array(z2.string()).min(1),
      riskLevel: z2.string().min(1),
      riskScore: z2.number().int(),
      recommendations: z2.array(z2.string()).default([]),
      frameworkSpecificRisks: z2.record(z2.string()).default({})
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
        riskScore: validated.riskScore
      }
    });
    const filepath = await generateRiskAssessmentPDF({
      description: validated.description,
      frameworks: validated.frameworks,
      riskLevel: validated.riskLevel,
      riskScore: validated.riskScore,
      recommendations: validated.recommendations,
      frameworkSpecificRisks: validated.frameworkSpecificRisks
    });
    res.download(filepath);
  }));
  app2.post("/api/remediation/suggest", requireAuth, asyncHandler(async (req, res) => {
    const schema = z2.object({
      frameworkControl: z2.string().min(1, "frameworkControl is required"),
      policyText: z2.string().min(1, "policyText is required"),
      industry: z2.string().optional(),
      companySize: z2.string().optional(),
      techStack: z2.array(z2.string()).optional(),
      persistPolicy: z2.boolean().optional().default(false),
      targetStatus: z2.enum(["draft", "under-review"]).optional().default("under-review"),
      policyTitle: z2.string().optional(),
      proTipAnswers: z2.object({
        auditBoundary: z2.object({
          handlesPIIorPHI: z2.enum(["none", "pii", "phi", "both"]).optional(),
          hasPhysicalOffices: z2.boolean().optional()
        }).optional(),
        evidencePipeline: z2.object({
          primaryTicketingSystem: z2.string().optional(),
          whereSystemLogsAreCentralized: z2.string().optional()
        }).optional(),
        accessControl: z2.object({
          timeToRevokeOffboarding: z2.enum(["same-day", "24-hours", "48-hours", "custom"]).optional(),
          customTimeToRevoke: z2.string().optional(),
          authMethod: z2.enum(["password-manager", "sso", "both", "other"]).optional()
        }).optional(),
        infrastructureDetail: z2.object({
          usesInfrastructureAsCode: z2.boolean().optional(),
          dataRetentionPolicyDuration: z2.string().optional()
        }).optional()
      }).optional()
    });
    const validated = schema.parse(req.body);
    const user = await storage.getUserById(req.user.id);
    const suggestion = await suggestRemediation2(validated, user);
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
      title: validated.policyTitle || `Remediation \u2014 ${validated.frameworkControl}`,
      description: suggestion.diffSummary,
      content: suggestion.suggestedPolicyPatch,
      version: "1.0",
      status: validated.targetStatus,
      frameworks: finalFrameworks,
      createdBy: "Current User",
      organizationId: req.user.organizationId,
      approvedBy: null
    });
    res.json({
      ...suggestion,
      createdPolicy: { id: createdPolicy.id, title: createdPolicy.title, status: createdPolicy.status }
    });
  }));
  app2.post("/api/remediation/scan-suggest", requireAuth, asyncHandler(async (req, res) => {
    const schema = z2.object({
      frameworkControl: z2.string().min(1, "frameworkControl is required"),
      industry: z2.string().optional(),
      companySize: z2.string().optional()
    });
    const validated = schema.parse(req.body);
    const user = await storage.getUserById(req.user.id);
    const frameworks = await storage.getComplianceFrameworks();
    const controlText = validated.frameworkControl.toLowerCase();
    const matchedFramework = frameworks.find((f) => controlText.includes((f.displayName || "").toLowerCase())) || frameworks.find((f) => controlText.includes((f.name || "").toLowerCase()));
    if (!matchedFramework) {
      return res.status(400).json({
        message: "Could not infer a compliance framework from frameworkControl. Try including 'GDPR', 'SOC 2', or 'EU AI Act' in the input."
      });
    }
    const checks = await storage.getComplianceChecks(matchedFramework.id);
    if (!checks || checks.length === 0) {
      return res.status(404).json({ message: "No compliance requirements found for the inferred framework." });
    }
    const chosenCheck = checks.find((c) => controlText.includes((c.checkName || "").toLowerCase())) || checks.find((c) => (c.description || "").toLowerCase().includes(controlText)) || checks[0];
    const allPolicies = await storage.getPolicies();
    const evidencePolicies = allPolicies.filter((p) => Array.isArray(p.frameworks) && p.frameworks.includes(matchedFramework.name));
    const policyText = evidencePolicies.length > 0 ? evidencePolicies.slice(0, 6).map((p) => `### ${p.title}
${p.content || p.description || ""}`).join("\n\n") : "";
    const vendors2 = await storage.getVendors();
    const techStack = vendors2.map((v) => v.name);
    const suggestion = await suggestRemediation2(
      {
        frameworkControl: chosenCheck.checkName,
        policyText,
        industry: validated.industry,
        companySize: validated.companySize,
        techStack
      },
      user
    );
    res.json(suggestion);
  }));
  app2.post(
    "/api/verified-links",
    requireAuth,
    asyncHandler(async (req, res) => {
      const schema = z2.object({
        supplierName: z2.string().min(1, "supplierName is required"),
        supplierDomain: z2.string().min(1).optional(),
        industry: z2.string().optional(),
        companySize: z2.string().optional(),
        badges: z2.array(z2.string()).optional(),
        documents: z2.array(z2.object({ title: z2.string().min(1), url: z2.string().url().optional() })).optional(),
        expiresAt: z2.string().optional()
      });
      const validated = schema.parse(req.body);
      const token = crypto4.randomBytes(24).toString("hex");
      const created = await storage.createVerifiedLink({
        token,
        organizationId: req.user.organizationId,
        supplierName: validated.supplierName,
        supplierDomain: validated.supplierDomain,
        industry: validated.industry,
        companySize: validated.companySize,
        badges: validated.badges ?? [],
        documents: validated.documents ?? [],
        expiresAt: validated.expiresAt
      });
      res.json({
        token: created.token,
        trustCenterUrl: `/trust-center/${created.token}`,
        supplierName: created.supplierName,
        supplierDomain: created.supplierDomain
      });
    })
  );
  app2.post(
    "/api/verified-links/generate",
    requireAuth,
    asyncHandler(async (req, res) => {
      const schema = z2.object({
        supplierName: z2.string().min(1, "supplierName is required"),
        supplierDomain: z2.string().optional(),
        industry: z2.string().optional(),
        companySize: z2.string().optional(),
        badges: z2.array(z2.string()).optional(),
        expiresAt: z2.string().optional(),
        attachApprovedPolicies: z2.boolean().optional().default(true)
      });
      const validated = schema.parse(req.body);
      const token = crypto4.randomBytes(24).toString("hex");
      const orgId = req.user.organizationId;
      const expiresAt = validated.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString();
      const documents = [];
      if (validated.attachApprovedPolicies) {
        const policies2 = await storage.getPolicies(orgId);
        const approvedPolicies = policies2.filter((p) => p.status === "approved" || p.status === "final");
        for (const policy of approvedPolicies) {
          documents.push({
            title: policy.title,
            url: `/api/trust-center/documents/policy/${policy.id}?token=${token}`
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
        expiresAt
      });
      res.json({
        token: created.token,
        trustCenterUrl: `/trust-center/${created.token}`,
        supplierName: created.supplierName,
        supplierDomain: created.supplierDomain,
        attachedDocuments: created.documents
      });
    })
  );
  app2.get(
    "/api/trust-center/documents/policy/:id",
    asyncHandler(async (req, res) => {
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const token = z2.string().min(1).parse(req.query.token);
      const link = await storage.getVerifiedLinkByToken(token);
      if (!link) return res.status(404).send("Trust center not found");
      if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
        return res.status(410).send("Trust center link expired");
      }
      const expectedUrl = `/api/trust-center/documents/policy/${id}?token=${token}`;
      const attached = Array.isArray(link.documents) && link.documents.some((d) => typeof d.url === "string" && d.url === expectedUrl);
      if (!attached) {
        return res.status(403).send("Policy not attached to this trust center link");
      }
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
          frameworks: policy.frameworks
        }
      });
      const filepath = await generatePolicyPDF(policy);
      res.download(filepath);
    })
  );
  app2.get("/api/trust-center/:token", asyncHandler(async (req, res) => {
    const schema = z2.object({ token: z2.string().min(1) });
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
      createdAt: link.createdAt
    });
  }));
  app2.post(
    "/api/policies/:id/export",
    requireAuth,
    asyncHandler(async (req, res) => {
      const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
      const policy = await storage.getPolicy(id, req.user.organizationId);
      if (!policy) return res.status(404).send("Policy not found");
      const filepath = await generatePolicyPDF(policy);
      res.download(filepath);
    })
  );
  app2.get("/download/installer", asyncHandler(async (_req, res) => {
    const filepath = path3.join(process.cwd(), "release", "RegReady Local Pro 1.0.0.exe");
    return res.sendFile(filepath, (err) => {
      if (err) {
        res.status(404).send("Installer not found. Ensure the build artifact exists in /release.");
      }
    });
  }));
  app2.use(notFoundHandler);
  app2.use(errorHandler);
  const httpServer = createServer(app2);
  return httpServer;
}
var asyncHandler, llmKeySchema, mockVendors, mockTeamMembers, mockTeamInvites, mockWorkspaceActivities, mockWorkspaceComments, mockWorkspaceTasks;
var init_routes = __esm({
  "server/routes.ts"() {
    "use strict";
    init_storage();
    init_llmService();
    init_pdf_generator();
    init_byokCrypto();
    init_auth();
    init_errorHandler();
    asyncHandler = (fn) => (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
    llmKeySchema = z2.object({
      apiKey: z2.string().min(1, "API key is required"),
      provider: z2.enum(["gemini"]).optional()
    });
    mockVendors = [
      {
        id: 1,
        name: "OpenAI",
        type: "ai-service",
        riskLevel: "low",
        gdprCompliant: true,
        soc2Compliant: true,
        aiActCompliant: false,
        lastAssessment: (/* @__PURE__ */ new Date()).toISOString(),
        notes: "AI model provider for policy generation"
      },
      {
        id: 2,
        name: "Stripe",
        type: "payment-processing",
        riskLevel: "low",
        gdprCompliant: true,
        soc2Compliant: true,
        aiActCompliant: true,
        lastAssessment: (/* @__PURE__ */ new Date()).toISOString(),
        notes: "Payment processing for subscription billing"
      },
      {
        id: 3,
        name: "Docker Hub",
        type: "infrastructure",
        riskLevel: "medium",
        gdprCompliant: true,
        soc2Compliant: true,
        aiActCompliant: true,
        lastAssessment: (/* @__PURE__ */ new Date()).toISOString(),
        notes: "Container registry for deployment"
      }
    ];
    mockTeamMembers = [
      {
        id: "1",
        email: "admin@regready.com",
        firstName: "Admin",
        lastName: "User",
        role: "owner",
        status: "active",
        joinedAt: "2025-01-01T00:00:00Z",
        lastActive: (/* @__PURE__ */ new Date()).toISOString(),
        permissions: ["*"],
        assignedProjects: ["GDPR Project", "SOC2 Audit"]
      },
      {
        id: "2",
        email: "compliance.manager@company.com",
        firstName: "Sarah",
        lastName: "Johnson",
        role: "admin",
        status: "active",
        joinedAt: "2025-02-15T00:00:00Z",
        lastActive: (/* @__PURE__ */ new Date()).toISOString(),
        permissions: ["manage_policies", "review_documents", "manage_team"],
        assignedProjects: ["GDPR Project", "AI Act Compliance"]
      }
    ];
    mockTeamInvites = [
      {
        id: "inv_1",
        email: "new.member@company.com",
        role: "contributor",
        invitedBy: "Admin User",
        invitedAt: "2025-08-03T00:00:00Z",
        expiresAt: "2025-08-10T00:00:00Z",
        status: "pending"
      }
    ];
    mockWorkspaceActivities = [
      {
        id: "1",
        type: "policy_update",
        title: "GDPR Data Processing Policy Updated",
        description: "Added new section on cookie consent management",
        user: { id: "2", name: "Sarah Johnson", avatar: void 0 },
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        relatedItem: { type: "policy", id: "1", title: "Data Processing Policy" }
      }
    ];
    mockWorkspaceComments = [
      {
        id: "1",
        content: "The data retention section needs clarification on the specific timeframes for different types of personal data.",
        user: { id: "3", name: "Michael Chen", avatar: void 0 },
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        replies: [],
        isResolved: false
      }
    ];
    mockWorkspaceTasks = [
      {
        id: "1",
        title: "Review GDPR Data Processing Procedures",
        description: "Conduct comprehensive review of current data processing activities and update documentation",
        priority: "high",
        status: "in_progress",
        assignee: { id: "2", name: "Sarah Johnson", avatar: void 0 },
        dueDate: "2025-08-10T00:00:00Z",
        relatedPolicy: "Data Processing Policy",
        tags: ["GDPR", "Review", "Priority"]
      }
    ];
  }
});

// server/vite.ts
var vite_exports = {};
__export(vite_exports, {
  log: () => log,
  serveStatic: () => serveStatic,
  setupVite: () => setupVite
});
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { nanoid } from "nanoid";
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const { createServer: createServer2, createLogger } = await import("vite");
  const viteLogger = createLogger();
  const viteRoot = path4.resolve(import.meta.dirname, "..", "client");
  const { default: reactPlugin } = await import("@vitejs/plugin-react");
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createServer2({
    root: viteRoot,
    base: "./",
    plugins: [reactPlugin()],
    resolve: {
      alias: {
        "@": path4.resolve(import.meta.dirname, "..", "client", "src"),
        "@assets": path4.resolve(import.meta.dirname, "..", "client", "src", "assets")
      }
    },
    server: {
      ...serverOptions,
      fs: { strict: false }
    },
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}
var init_vite = __esm({
  "server/vite.ts"() {
    "use strict";
  }
});

// server/index.ts
import express2 from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import path5 from "path";
import fs4 from "fs";
import os from "os";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/services/appSecrets.ts
init_db();
init_schema();
import crypto from "crypto";
function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}
function ensure32CharEncryptionKey() {
  return randomHex(16);
}
async function ensureAppSecrets() {
  const requiredKeys = ["SESSION_SECRET", "JWT_SECRET", "ENCRYPTION_KEY"];
  const rows = await db.select({ key: appSecrets.key, value: appSecrets.value }).from(appSecrets);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const updates = [];
  for (const key of requiredKeys) {
    const fromDb = map.get(key);
    const fromEnv = process.env[key];
    if (!fromEnv && fromDb) {
      process.env[key] = fromDb;
      continue;
    }
    if (fromEnv && !fromDb) {
      updates.push({ key, value: fromEnv });
      continue;
    }
    if (!fromEnv && !fromDb) {
      const value = key === "ENCRYPTION_KEY" ? ensure32CharEncryptionKey() : randomHex(32);
      updates.push({ key, value });
      process.env[key] = value;
    }
  }
  if (updates.length > 0) {
    await db.insert(appSecrets).values(updates);
  }
}

// server/index.ts
init_errorHandler();

// server/middleware/rateLimit.ts
var store = /* @__PURE__ */ new Map();
function getRateLimitMaxKeys() {
  const raw = process.env.RATE_LIMIT_MAX_KEYS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1e4;
}
function cleanupExpired(now) {
  const keysToDelete = [];
  store.forEach((entry, key) => {
    if (entry.resetTime <= now) keysToDelete.push(key);
  });
  for (const key of keysToDelete) store.delete(key);
}
function evictIfTooLarge(now) {
  const maxKeys = getRateLimitMaxKeys();
  if (store.size <= maxKeys) return;
  cleanupExpired(now);
  if (store.size <= maxKeys) return;
  const entries = [];
  store.forEach((value, key) => entries.push([key, value]));
  entries.sort((a, b) => a[1].resetTime - b[1].resetTime);
  const targetSize = maxKeys;
  for (let i = 0; i < entries.length && store.size > targetSize; i++) {
    store.delete(entries[i][0]);
  }
}
var createRateLimit = (options) => {
  const {
    windowMs,
    max,
    message = "Too many requests",
    keyGenerator = (req) => req.ip || req.connection?.remoteAddress || "unknown"
  } = options;
  return (req, res, next) => {
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
        retryAfter: Math.ceil((existing.resetTime - now) / 1e3)
      });
    }
    existing.count += 1;
    store.set(key, existing);
    return next();
  };
};
var apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 100,
  // 100 requests per window
  message: "API rate limit exceeded. Please try again later."
});
var authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 50,
  // 50 auth attempts per window (much more generous for live users)
  message: "Too many authentication attempts. Please try again later."
});
var aiGenerationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1e3,
  // 1 hour
  max: 10,
  // 10 AI generations per hour for starter, more for higher tiers
  message: "AI generation rate limit exceeded. Upgrade your plan for higher limits."
});

// server/services/security.ts
import crypto2 from "crypto";
var SecurityService = class {
  securityEvents = [];
  suspiciousIPs = /* @__PURE__ */ new Set();
  failedLoginAttempts = /* @__PURE__ */ new Map();
  // Input sanitization
  sanitizeInput(input) {
    if (typeof input === "string") {
      return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/javascript:/gi, "").replace(/on\w+\s*=/gi, "").trim();
    }
    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }
    if (typeof input === "object" && input !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }
  // SQL injection detection
  detectSQLInjection(input) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /('|"|\-\-|\;|\||\/\*|\*\/)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\bUNION\s+SELECT)/i
    ];
    return sqlPatterns.some((pattern) => pattern.test(input));
  }
  // Rate limiting tracking
  trackFailedLogin(identifier, req) {
    const current = this.failedLoginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    if (now - current.lastAttempt > 15 * 60 * 1e3) {
      current.count = 0;
    }
    current.count++;
    current.lastAttempt = now;
    this.failedLoginAttempts.set(identifier, current);
    if (current.count >= 3) {
      this.logSecurityEvent({
        type: "suspicious_activity",
        severity: current.count >= 10 ? "critical" : "medium",
        details: {
          failedAttempts: current.count,
          identifier,
          timeWindow: "15m"
        },
        timestamp: now,
        userAgent: req.get("User-Agent"),
        ip: req.ip
      });
      if (current.count >= 10 && req.ip) {
        this.suspiciousIPs.add(req.ip);
      }
    }
    return current.count;
  }
  // Check if IP is blocked
  isIPBlocked(ip) {
    return this.suspiciousIPs.has(ip);
  }
  // Data encryption utilities (production-grade AES-256-GCM)
  // Format: ivHex:tagHex:cipherHex
  encrypt(text2, key) {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || "default-key-change-in-production";
    const keyBuf = crypto2.createHash("sha256").update(encryptionKey).digest();
    const iv = crypto2.randomBytes(12);
    const algorithm = "aes-256-gcm";
    const cipher = crypto2.createCipheriv(algorithm, keyBuf, iv);
    const cipherHex = Buffer.concat([cipher.update(text2, "utf8"), cipher.final()]).toString("hex");
    const tagHex = cipher.getAuthTag().toString("hex");
    return iv.toString("hex") + ":" + tagHex + ":" + cipherHex;
  }
  decrypt(encryptedText, key) {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || "default-key-change-in-production";
    const keyBuf = crypto2.createHash("sha256").update(encryptionKey).digest();
    const algorithm = "aes-256-gcm";
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted payload format");
    }
    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = crypto2.createDecipheriv(algorithm, keyBuf, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, "hex")),
      decipher.final()
    ]).toString("utf8");
    return decrypted;
  }
  // Hash sensitive data
  hash(data) {
    return crypto2.createHash("sha256").update(data).digest("hex");
  }
  // Generate secure tokens
  generateSecureToken(length = 32) {
    return crypto2.randomBytes(length).toString("hex");
  }
  // Validate request integrity
  validateRequestIntegrity(req) {
    const userAgent = req.get("User-Agent") || "";
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /burp/i,
      /wget/i,
      /curl.*bot/i
    ];
    const isSuspiciousUserAgent = suspiciousPatterns.some((pattern) => pattern.test(userAgent));
    if (isSuspiciousUserAgent) {
      this.logSecurityEvent({
        type: "suspicious_activity",
        severity: "medium",
        details: {
          reason: "Suspicious User-Agent",
          userAgent,
          path: req.path
        },
        timestamp: Date.now(),
        userAgent,
        ip: req.ip
      });
      return false;
    }
    const queryString = new URLSearchParams(req.query).toString();
    if (this.detectSQLInjection(queryString)) {
      this.logSecurityEvent({
        type: "data_breach_attempt",
        severity: "high",
        details: {
          reason: "SQL Injection attempt in query parameters",
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
  logSecurityEvent(event) {
    this.securityEvents.push(event);
    console.warn(`[SECURITY] ${event.type} - ${event.severity}:`, event.details);
    if (event.severity === "critical" || event.severity === "high") {
      this.alertSecurityTeam(event);
    }
  }
  // Get security dashboard data
  getSecurityMetrics(timeRange = "24h") {
    const timeRangeMs = {
      "1h": 60 * 60 * 1e3,
      "24h": 24 * 60 * 60 * 1e3,
      "7d": 7 * 24 * 60 * 60 * 1e3
    };
    const cutoff = Date.now() - timeRangeMs[timeRange];
    const recentEvents = this.securityEvents.filter((e) => e.timestamp > cutoff);
    return {
      totalSecurityEvents: recentEvents.length,
      eventsBySeverity: {
        critical: recentEvents.filter((e) => e.severity === "critical").length,
        high: recentEvents.filter((e) => e.severity === "high").length,
        medium: recentEvents.filter((e) => e.severity === "medium").length,
        low: recentEvents.filter((e) => e.severity === "low").length
      },
      eventsByType: {
        suspicious_activity: recentEvents.filter((e) => e.type === "suspicious_activity").length,
        rate_limit_exceeded: recentEvents.filter((e) => e.type === "rate_limit_exceeded").length,
        unauthorized_access: recentEvents.filter((e) => e.type === "unauthorized_access").length,
        data_breach_attempt: recentEvents.filter((e) => e.type === "data_breach_attempt").length
      },
      blockedIPs: Array.from(this.suspiciousIPs),
      failedLoginAttempts: Object.fromEntries(this.failedLoginAttempts),
      recentEvents: recentEvents.slice(-10)
      // Last 10 events
    };
  }
  // Alert security team (mock implementation)
  alertSecurityTeam(event) {
    console.error(`[SECURITY ALERT] ${event.severity.toUpperCase()}: ${event.type}`, event);
  }
  // GDPR compliance utilities
  anonymizeUserData(data) {
    const sensitiveFields = ["email", "phone", "address", "ssn", "credit_card"];
    if (typeof data === "object" && data !== null) {
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
};
var security = new SecurityService();

// server/middleware/security.ts
var csrfProtection = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const hasBearerToken = typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  if (hasBearerToken) return next();
  if (req.path === "/api/auth/login") return next();
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method) && process.env.NODE_ENV === "production") {
    const token = req.headers["x-csrf-token"] || req.body?._csrf;
    if (!token) {
      return res.status(403).json({
        error: "CSRF token required",
        code: "CSRF_MISSING"
      });
    }
  }
  next();
};
var contentSecurityPolicy = (req, res, next) => {
  const isProd2 = process.env.NODE_ENV === "production";
  const isElectronDesktop = process.env.ELECTRON_DESKTOP === "true" || // robust: works regardless of env vars
    typeof process.versions?.electron === "string";
  const allowInlineForClient = !isProd2 || isElectronDesktop;
  const scriptSrc = allowInlineForClient ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'";
  const styleSrc = allowInlineForClient ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" : "style-src 'self' https://fonts.googleapis.com";
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "frame-src 'self'"
  ].join("; "));
  next();
};
var securityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=(self)"
  ].join(", "));
  next();
};
var requestSizeLimit = (maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers["content-length"] || "0");
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: "Request too large",
        code: "REQUEST_TOO_LARGE",
        maxSize: `${maxSize / (1024 * 1024)}MB`
      });
    }
    next();
  };
};
var sensitiveDataProtection = (req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    if (typeof data === "string") {
      data = data.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[REDACTED-CC]");
      data = data.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED-SSN]");
      data = data.replace(/\b[a-zA-Z0-9]{32,}\b/g, (match) => {
        if (match.toLowerCase().includes("key") || match.toLowerCase().includes("token")) {
          return "[REDACTED-KEY]";
        }
        return match;
      });
    }
    return originalSend.call(this, data);
  };
  next();
};

// server/index.ts
init_db();
var app = express2();
var APP_NAME = "RegReady Local Pro";
var isProd = process.env.NODE_ENV === "production" || !fs4.existsSync(path5.join(process.cwd(), "src"));
var appRootDefault = (() => {
  const __dirname = path5.dirname(fileURLToPath2(import.meta.url));
  return path5.resolve(__dirname, "..");
})();
var baseDir = process.env.REGREADY_BASE_DIR ?? (isProd ? appRootDefault : process.cwd());
function log2(message) {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  console.log(`${formattedTime} [${APP_NAME}] ${message}`);
}
app.use(compression());
var corsOrigin = isProd ? process.env.CORS_ORIGIN || false : true;
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: corsOrigin,
    credentials: Boolean(corsOrigin)
  })
);
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ extended: false, limit: "50mb" }));
app.use(securityHeaders);
app.use(contentSecurityPolicy);
app.use("/api/auth/login", authRateLimit);
app.use("/api", apiRateLimit);
app.use("/api", requestSizeLimit(10 * 1024 * 1024));
app.use("/api", csrfProtection);
app.use("/api", sensitiveDataProtection);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log2(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});
async function validateDbSchemaOrThrow() {
  const requiredTables = [
    "users",
    "app_secrets",
    "policies",
    "compliance_frameworks",
    "compliance_checks",
    "vendors",
    "risk_assessments",
    "audit_reports",
    "document_versions",
    "verified_links",
    "team_members",
    "workspace_settings"
  ];
  for (const tableName of requiredTables) {
    const row = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
    if (!row) {
      throw new Error(
        `Database schema validation failed: missing table '${tableName}'. Run 'npm run db:push' (or reset local.db) to initialize schema.`
      );
    }
  }
  const verifiedCols = sqlite.prepare("PRAGMA table_info(verified_links)").all();
  const hasOrgCol = verifiedCols.some((c) => c.name === "organization_id");
  if (!hasOrgCol) {
    throw new Error(
      "Database schema validation failed: verified_links.organization_id is missing. Run 'npm run db:push' (or reset local.db) and retry."
    );
  }
}
function scheduleGeneratedPdfCleanup() {
  const retentionHours = parseInt(process.env.PDF_RETENTION_HOURS || "24", 10);
  const cutoffMs = Date.now() - retentionHours * 60 * 60 * 1e3;
  const dir = path5.join(baseDir, "generated-pdfs");
  const cleanupOnce = () => {
    try {
      if (!fs4.existsSync(dir)) return;
      const entries = fs4.readdirSync(dir);
      for (const name of entries) {
        const filepath = path5.join(dir, name);
        try {
          const stat = fs4.statSync(filepath);
          if (stat.isFile() && stat.mtimeMs < cutoffMs) fs4.unlinkSync(filepath);
        } catch {
        }
      }
    } catch {
    }
  };
  cleanupOnce();
  setInterval(cleanupOnce, 60 * 60 * 1e3).unref();
}
(async () => {
  try {
    if (isProd) {
      log2("Production runtime detected. Running database migration engine...");
      try {
        const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
        const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const resourcesRoot = isProd && baseDir.includes("app.asar") ? path5.dirname(baseDir) : baseDir;
        const migrationCandidates = [
          path5.join(resourcesRoot, "app.asar.unpacked", "migrations"),
          path5.join(resourcesRoot, "app.asar.unpacked", "migrations", "migrations"),
          path5.join(resourcesRoot, "app.asar.unpacked", "migrations", "sql"),
          path5.join(baseDir, "migrations"),
          path5.join(baseDir, "app.asar.unpacked", "migrations")
        ];
        const migrationsFolder = migrationCandidates.find((p) => fs4.existsSync(p));
        if (!migrationsFolder) {
          throw new Error(
            `[${APP_NAME}] Migrations folder not found. Looked in: ${migrationCandidates.join(" | ")}`
          );
        }
        await migrate(db2, { migrationsFolder });
        log2(`Database tables built/verified successfully via migrations. folder=${migrationsFolder}`);
      } catch (migrationError) {
        console.error("\u26A0\uFE0F Automated database table generation failed:", migrationError);
      }
    }
    await ensureAppSecrets();
    await validateDbSchemaOrThrow();
    scheduleGeneratedPdfCleanup();
    const { registerRoutes: registerRoutes2 } = await Promise.resolve().then(() => (init_routes(), routes_exports));
    const server = await registerRoutes2(app);
    const serverModulePath = fileURLToPath2(import.meta.url);
    const inferredUnpackedAppRoot = (() => {
      const asarSegment = "/app.asar/";
      const unpackedSegment = "/app.asar.unpacked/";
      if (!serverModulePath.includes(asarSegment)) return null;
      const unpackedIndexPath = serverModulePath.replace(asarSegment, unpackedSegment);
      return path5.resolve(path5.dirname(unpackedIndexPath), "..");
    })();
    const staticCandidates = (() => {
      const unpackedCandidates = [];
      const asarCandidates = [];
      unpackedCandidates.push(
        path5.join(baseDir, "app.asar.unpacked", "dist", "public"),
        path5.join(baseDir, "app.asar.unpacked", "public")
      );
      if (inferredUnpackedAppRoot) {
        unpackedCandidates.push(
          path5.join(inferredUnpackedAppRoot, "dist", "public"),
          path5.join(inferredUnpackedAppRoot, "public")
        );
      }
      asarCandidates.push(path5.join(baseDir, "dist", "public"), path5.join(baseDir, "public"));
      return [...unpackedCandidates, ...asarCandidates];
    })();
    const staticDir = staticCandidates.find((dir) => fs4.existsSync(path5.join(dir, "index.html"))) || staticCandidates[0];
    const indexHtmlPath = path5.join(staticDir, "index.html");
    let canServeStatic = false;
    try {
      fs4.accessSync(indexHtmlPath, fs4.constants.R_OK);
      canServeStatic = true;
    } catch {
      canServeStatic = false;
    }
    if (canServeStatic) {
      log2(`Serving static client interface from: ${staticDir}`);
      app.use(express2.static(staticDir, {
        maxAge: isProd ? "1y" : "0",
        etag: false
      }));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        if (req.method !== "GET") return next();
        if (path5.extname(req.path)) return next();
        const acceptsHtml = req.accepts("html");
        if (acceptsHtml !== "html") return next();
        return res.sendFile(indexHtmlPath);
      });
    } else {
      if (isProd) {
        console.error(`[${APP_NAME}] Critical Error: Production static UI assets could not be located. Looked in: ${staticCandidates.join(" | ")}`);
      } else {
        console.warn(`[${APP_NAME}] Static client not found. Falling back to dev Vite middleware.`);
        const { setupVite: setupVite2 } = await Promise.resolve().then(() => (init_vite(), vite_exports));
        await setupVite2(app, server);
      }
    }
    app.use(notFoundHandler);
    app.use(errorHandler);
    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(port, "127.0.0.1", () => {
      log2(`\u{1F680} Local Pro Engine active at http://127.0.0.1:${port}`);
    });
  } catch (error) {
    const crashLogPath = path5.join(os.tmpdir(), `regready-startup-crash-${Date.now()}.log`);
    const message = error instanceof Error ? error.stack || error.message : String(error);
    try {
      fs4.writeFileSync(crashLogPath, `${(/* @__PURE__ */ new Date()).toISOString()}
${message}
`, { encoding: "utf8" });
      console.error(`[${APP_NAME}] Wrote crash log: ${crashLogPath}`);
    } catch {
    }
    console.error("\u274C Failed to start Local Engine:", error);
    if (process.env.ELECTRON_DESKTOP === "true") {
      return;
    }
    process.exit(1);
  }
})();
