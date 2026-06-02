import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
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
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const appSecrets = sqliteTable("app_secrets", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertAppSecretSchema = createInsertSchema(appSecrets).omit({
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const policies = sqliteTable("policies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  content: text("content"),
  version: text("version").notNull().default("1.0"),
  status: text("status").notNull().default("draft"),
  frameworks: text("frameworks", { mode: "json" }).$type<string[]>().default([]),
  createdBy: text("created_by").notNull(),
  approvedBy: text("approved_by"),
  organizationId: integer("organization_id").notNull().default(1),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
  approvedAt: text("approved_at"),
});

export const complianceFrameworks = sqliteTable("compliance_frameworks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  completionPercentage: real("completion_percentage").default(0),
  status: text("status").notNull().default("in-progress"),
  lastUpdated: text("last_updated").default("CURRENT_TIMESTAMP").notNull(),
});

export const complianceChecks = sqliteTable("compliance_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  frameworkId: integer("framework_id").notNull().references(() => complianceFrameworks.id),
  checkName: text("check_name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  evidence: text("evidence"),
  lastChecked: text("last_checked").default("CURRENT_TIMESTAMP").notNull(),
});

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  riskLevel: text("risk_level").notNull().default("medium"),
  gdprCompliant: integer("gdpr_compliant", { mode: "boolean" }).default(false),
  soc2Compliant: integer("soc2_compliant", { mode: "boolean" }).default(false),
  aiActCompliant: integer("ai_act_compliant", { mode: "boolean" }).default(false),
  lastAssessment: text("last_assessment").default("CURRENT_TIMESTAMP").notNull(),
  notes: text("notes"),
});

export const riskAssessments = sqliteTable("risk_assessments", {
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
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const auditReports = sqliteTable("audit_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  framework: text("framework"),
  status: text("status").notNull().default("draft"),
  summary: text("summary"),
  findings: text("findings", { mode: "json" }).$type<unknown[]>().default([]),
  recommendations: text("recommendations", { mode: "json" }).$type<string[]>().default([]),
  generatedBy: text("generated_by").notNull(),

  // Tenant scoping
  organizationId: integer("organization_id").notNull().default(1),

  generatedAt: text("generated_at").default("CURRENT_TIMESTAMP").notNull(),
  filePath: text("file_path"),
});

export const documentVersions = sqliteTable("document_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  policyId: integer("policy_id").notNull().references(() => policies.id),
  version: text("version").notNull(),
  content: text("content").notNull(),
  changeNotes: text("change_notes"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertPolicySchema = createInsertSchema(policies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertComplianceFrameworkSchema = createInsertSchema(complianceFrameworks).omit({
  id: true,
  lastUpdated: true,
});

export const insertComplianceCheckSchema = createInsertSchema(complianceChecks).omit({
  id: true,
  lastChecked: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  lastAssessment: true,
});

export const insertRiskAssessmentSchema = createInsertSchema(riskAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditReportSchema = createInsertSchema(auditReports).omit({
  id: true,
  generatedAt: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertOpenAiKeySchema = z.object({
  apiKey: z.string().min(1).regex(/^sk-[A-Za-z0-9_-]{10,}$/),
});

export const insertGeminiKeySchema = z.object({
  apiKey: z.string().min(1).regex(/^AIza[0-9A-Za-z_-]{10,}$/),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Policy = typeof policies.$inferSelect;
export type InsertPolicy = z.infer<typeof insertPolicySchema>;

export type ComplianceFramework = typeof complianceFrameworks.$inferSelect;
export type InsertComplianceFramework = z.infer<typeof insertComplianceFrameworkSchema>;

export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type InsertComplianceCheck = z.infer<typeof insertComplianceCheckSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type InsertRiskAssessment = z.infer<typeof insertRiskAssessmentSchema>;

export type AuditReport = typeof auditReports.$inferSelect;
export type InsertAuditReport = z.infer<typeof insertAuditReportSchema>;

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

/**
 * -------------------------
 * Team / Workspace settings (CRUD Phase)
 * -------------------------
 */
export const teamMembers = sqliteTable("team_members", {
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

  permissions: text("permissions", { mode: "json" }).$type<string[]>().default([]),
  assignedProjects: text("assigned_projects", { mode: "json" }).$type<string[]>().default([]),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers);

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

/**
 * Selected framework coverage + workspace-level preferences.
 * Used by the recommendation engine to determine “what the user selected”.
 */
export const workspaceSettings = sqliteTable("workspace_settings", {
  // Single-tenant “local pro” for now; store one row per organization.
  organizationId: integer("organization_id").primaryKey(),

  selectedFrameworks: text("selected_frameworks", { mode: "json" }).$type<string[]>().default([]),
  selectedPolicyTitles: text("selected_policy_titles", { mode: "json" }).$type<string[]>().default([]),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

export const insertWorkspaceSettingsSchema = createInsertSchema(workspaceSettings).omit({
  updatedAt: true,
});

export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type InsertWorkspaceSettings = z.infer<typeof insertWorkspaceSettingsSchema>;

// -------------------------
// Verified Link / Trust Center (Phase 1)
// -------------------------
export const verifiedLinks = sqliteTable("verified_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(), // universal link token (e.g. used in /trust-center/:token)

  // Tenant scoping: who owns this trust-center link
  organizationId: integer("organization_id").notNull().default(1),

  supplierName: text("supplier_name").notNull(),
  supplierDomain: text("supplier_domain"),

  industry: text("industry"),
  companySize: text("company_size"),

  badges: text("badges", { mode: "json" }).$type<string[]>().default([]),
  // documents can be titles + optional URLs (read-only)
  documents: text("documents", { mode: "json" }).$type<Array<{ title: string; url?: string }>>().default([]),

  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
  expiresAt: text("expires_at"),
});

export const insertVerifiedLinkSchema = createInsertSchema(verifiedLinks).omit({
  id: true,
  createdAt: true,
});

export type VerifiedLink = typeof verifiedLinks.$inferSelect;
export type InsertVerifiedLink = z.infer<typeof insertVerifiedLinkSchema>;

/**
 * -------------------------
 * Activity / audit logging (release polish)
 * -------------------------
 */
export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // Actor
  userId: integer("user_id").notNull().references(() => users.id),

  // Tenant scoping
  organizationId: integer("organization_id").notNull().default(1),

  // What happened
  action: text("action").notNull(), // e.g. "policy_export", "audit_report_export", "risk_analyze", etc.
  entityType: text("entity_type").notNull(), // e.g. "policy" | "audit_report" | "risk_assessment"
  entityId: text("entity_id"), // store as string to allow different id types
  
  // Optional details
  metadata: text("metadata", { mode: "json" }).$type<unknown>().default({}),

  createdAt: text("created_at").default("CURRENT_TIMESTAMP").notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  createdAt: true,
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
