import { 
  Policy, 
  InsertPolicy, 
  ComplianceFramework, 
  InsertComplianceFramework,
  ComplianceCheck, 
  InsertComplianceCheck,
  Vendor, 
  InsertVendor,
  RiskAssessment, 
  InsertRiskAssessment,
  AuditReport, 
  InsertAuditReport,
  DocumentVersion, 
  InsertDocumentVersion,
  User, 
  InsertUser,
  VerifiedLink,
  InsertVerifiedLink,
  ActivityLog,
  InsertActivityLog,
  activityLogs,
  policies,
  complianceFrameworks,
  complianceChecks,
  vendors,
  riskAssessments,
  auditReports,
  documentVersions,
  users,
  verifiedLinks
} from "@shared/schema";
import { db } from "./db";
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  private readonly JWT_SECRET: string;

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set. Ensure ensureAppSecrets() ran before DatabaseStorage initialization.");
    }
    this.JWT_SECRET = secret;
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      const existingFrameworks = await db.select().from(complianceFrameworks);
      
      if (existingFrameworks.length === 0) {
        // Initialize default compliance frameworks
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

        // Initialize default compliance controls (Requirement Layer)
        // These are intentionally minimal seed controls so the Scan layer can compare
        // local evidence (policies) against framework requirements.
        const gdprFramework = await db
          .select()
          .from(complianceFrameworks)
          .where(eq(complianceFrameworks.name, "gdpr"));
        const soc2Framework = await db
          .select()
          .from(complianceFrameworks)
          .where(eq(complianceFrameworks.name, "soc2"));
        const euAiActFramework = await db
          .select()
          .from(complianceFrameworks)
          .where(eq(complianceFrameworks.name, "eu-ai-act"));

        const gdprId = gdprFramework[0]?.id;
        const soc2Id = soc2Framework[0]?.id;
        const euAiActId = euAiActFramework[0]?.id;

        if (gdprId && soc2Id && euAiActId) {
          const defaultComplianceChecks = [
            // GDPR
            {
              frameworkId: gdprId,
              checkName: "GDPR Art. 30 — Records of Processing",
              description:
                "Maintain records of processing activities (including purposes, categories of data subjects, recipients, and retention timelines) for compliance readiness.",
              status: "pending",
              evidence: "",
            },
            {
              frameworkId: gdprId,
              checkName: "GDPR Art. 32 — Security of Processing",
              description:
                "Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including encryption and access controls.",
              status: "pending",
              evidence: "",
            },

            // SOC 2
            {
              frameworkId: soc2Id,
              checkName: "SOC 2 — Access Control & Monitoring",
              description:
                "Implement logical access controls and monitoring to ensure only authorized users have access, with periodic review of access permissions.",
              status: "pending",
              evidence: "",
            },
            {
              frameworkId: soc2Id,
              checkName: "SOC 2 — Incident Response Readiness",
              description:
                "Maintain incident response procedures including detection, triage, containment, eradication, and recovery, and evidence of testing/simulations.",
              status: "pending",
              evidence: "",
            },

            // EU AI Act
            {
              frameworkId: euAiActId,
              checkName: "EU AI Act — AI System Documentation",
              description:
                "Maintain documentation for AI systems, including purpose, risk classification, and governance/oversight procedures.",
              status: "pending",
              evidence: "",
            },
          ];

          await db.insert(complianceChecks).values(defaultComplianceChecks);
        }
        
        // Initialize default vendors
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

        // Initialize sample policies
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
            nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
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
            nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];

        // Skip policies initialization for now to avoid schema conflicts

        // Initialize sample risk assessments
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
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];

        await db.insert(riskAssessments).values(defaultRiskAssessments);
      }
    } catch (error) {
      console.error('Error initializing default data:', error);
    }
  }

  // User operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    return bcrypt.compare(password, user.password);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  generateAuthToken(userId: number): string {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: '30d' });
  }

  // Policy operations (tenant-scoped by organizationId)
  async getPolicies(organizationId?: number): Promise<Policy[]> {
    const whereClause = organizationId ? eq(policies.organizationId, organizationId) : undefined;
    const query = whereClause ? db.select().from(policies).where(whereClause) : db.select().from(policies);
    return query;
  }

  async getPolicy(id: number, organizationId?: number): Promise<Policy | undefined> {
    const whereClause = organizationId
      ? and(eq(policies.id, id), eq(policies.organizationId, organizationId))
      : eq(policies.id, id);

    const [policy] = await db.select().from(policies).where(whereClause);
    return policy;
  }

  async createPolicy(policy: InsertPolicy): Promise<Policy> {
    const policyData = {
      type: policy.type,
      title: policy.title,
      description: policy.description || null,
      content: policy.content || null,
      version: policy.version || "1.0",
      status: policy.status || "draft",
      // Drizzle typing for JSON columns may surface as `Json[]`; force to the schema's string[] contract.
      frameworks: (Array.isArray(policy.frameworks) ? policy.frameworks : []) as unknown as string[],
      createdBy: policy.createdBy,
      organizationId: policy.organizationId ?? 1,
      approvedBy: policy.approvedBy || null,
    };
    
    const [newPolicy] = await db.insert(policies).values(policyData as any).returning();
    return newPolicy;
  }

  async updatePolicy(
    id: number,
    policy: Partial<InsertPolicy>,
    organizationId?: number
  ): Promise<Policy | undefined> {
    const updateData: any = { updatedAt: new Date() };

    if (policy.type) updateData.type = policy.type;
    if (policy.title) updateData.title = policy.title;
    if (policy.description !== undefined) updateData.description = policy.description;
    if (policy.content !== undefined) updateData.content = policy.content;
    if (policy.version) updateData.version = policy.version;
    if (policy.status) updateData.status = policy.status;
    if (policy.frameworks) updateData.frameworks = Array.isArray(policy.frameworks) ? policy.frameworks : [];
    if (policy.approvedBy !== undefined) updateData.approvedBy = policy.approvedBy;

    const whereClause = organizationId
      ? and(eq(policies.id, id), eq(policies.organizationId, organizationId))
      : eq(policies.id, id);

    const [updatedPolicy] = await db
      .update(policies)
      .set(updateData)
      .where(whereClause)
      .returning();
    return updatedPolicy;
  }

  async deletePolicy(id: number, organizationId?: number): Promise<boolean> {
    const whereClause = organizationId
      ? and(eq(policies.id, id), eq(policies.organizationId, organizationId))
      : eq(policies.id, id);

    await db.delete(policies).where(whereClause);
    return true;
  }

  // Compliance framework operations
  async getComplianceFrameworks(): Promise<ComplianceFramework[]> {
    return db.select().from(complianceFrameworks);
  }

  async getComplianceFramework(id: number): Promise<ComplianceFramework | undefined> {
    const [framework] = await db.select().from(complianceFrameworks).where(eq(complianceFrameworks.id, id));
    return framework;
  }

  async createComplianceFramework(framework: InsertComplianceFramework): Promise<ComplianceFramework> {
    const [newFramework] = await db.insert(complianceFrameworks).values(framework).returning();
    return newFramework;
  }

  async updateComplianceFramework(id: number, framework: Partial<InsertComplianceFramework>): Promise<ComplianceFramework | undefined> {
    const [updatedFramework] = await db
      .update(complianceFrameworks)
      .set({ ...framework, lastUpdated: new Date().toISOString() })
      .where(eq(complianceFrameworks.id, id))
      .returning();
    return updatedFramework;
  }

  // Compliance check operations
  async getComplianceChecks(frameworkId?: number): Promise<ComplianceCheck[]> {
    if (frameworkId) {
      return db.select().from(complianceChecks).where(eq(complianceChecks.frameworkId, frameworkId));
    }
    return db.select().from(complianceChecks);
  }

  async createComplianceCheck(check: InsertComplianceCheck): Promise<ComplianceCheck> {
    const [newCheck] = await db.insert(complianceChecks).values(check).returning();
    return newCheck;
  }

  async updateComplianceCheck(id: number, check: Partial<InsertComplianceCheck>): Promise<ComplianceCheck | undefined> {
    const [updatedCheck] = await db
      .update(complianceChecks)
      .set({ ...check, lastChecked: new Date().toISOString() })
      .where(eq(complianceChecks.id, id))
      .returning();
    return updatedCheck;
  }

  // Vendor operations
  async getVendors(): Promise<Vendor[]> {
    return db.select().from(vendors);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const [newVendor] = await db.insert(vendors).values(vendor).returning();
    return newVendor;
  }

  async updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [updatedVendor] = await db
      .update(vendors)
      .set({ ...vendor, lastAssessment: new Date().toISOString() })
      .where(eq(vendors.id, id))
      .returning();
    return updatedVendor;
  }

  async deleteVendor(id: number): Promise<boolean> {
    await db.delete(vendors).where(eq(vendors.id, id));
    return true;
  }

  // Risk assessment operations (tenant-scoped by organizationId)
  async getRiskAssessments(organizationId?: number): Promise<RiskAssessment[]> {
    const whereClause = organizationId ? eq(riskAssessments.organizationId, organizationId) : undefined;
    return db.select().from(riskAssessments).where(whereClause);
  }

  async getRiskAssessment(id: number, organizationId?: number): Promise<RiskAssessment | undefined> {
    const whereClause = organizationId
      ? and(eq(riskAssessments.id, id), eq(riskAssessments.organizationId, organizationId))
      : eq(riskAssessments.id, id);

    const [assessment] = await db.select().from(riskAssessments).where(whereClause);
    return assessment;
  }

  async createRiskAssessment(assessment: InsertRiskAssessment, organizationId?: number): Promise<RiskAssessment> {
    const record = organizationId ? { ...assessment, organizationId } : assessment;
    const [newAssessment] = await db.insert(riskAssessments).values(record).returning();
    return newAssessment;
  }

  async updateRiskAssessment(
    id: number,
    assessment: Partial<InsertRiskAssessment>,
    organizationId?: number
  ): Promise<RiskAssessment | undefined> {
    const whereClause = organizationId
      ? and(eq(riskAssessments.id, id), eq(riskAssessments.organizationId, organizationId))
      : eq(riskAssessments.id, id);

    const [updatedAssessment] = await db
      .update(riskAssessments)
      .set({ ...assessment, updatedAt: new Date().toISOString() })
      .where(whereClause)
      .returning();
    return updatedAssessment;
  }

  // Audit report operations (tenant-scoped by organizationId)
  async getAuditReports(organizationId?: number): Promise<AuditReport[]> {
    const whereClause = organizationId ? eq(auditReports.organizationId, organizationId) : undefined;
    return db.select().from(auditReports).where(whereClause);
  }

  async getAuditReport(id: number, organizationId?: number): Promise<AuditReport | undefined> {
    const whereClause = organizationId
      ? and(eq(auditReports.id, id), eq(auditReports.organizationId, organizationId))
      : eq(auditReports.id, id);

    const [report] = await db.select().from(auditReports).where(whereClause);
    return report;
  }

  async createAuditReport(report: InsertAuditReport, organizationId?: number): Promise<AuditReport> {
    const reportData = {
      title: report.title,
      type: report.type,
      framework: report.framework || null,
      status: report.status || "draft",
      summary: report.summary || null,
      // ensure types align with DB expectations (string[]). Cast as needed.
      findings: (Array.isArray(report.findings) ? report.findings : []) as unknown as string[],
      recommendations: (Array.isArray(report.recommendations) ? report.recommendations : []) as unknown as string[],
      generatedBy: report.generatedBy,
      filePath: report.filePath || null,
      organizationId: organizationId ?? report.organizationId ?? 1,
    };

    const [newReport] = await db.insert(auditReports).values(reportData).returning();
    return newReport;
  }

  // Document version operations
  async getDocumentVersions(policyId: number): Promise<DocumentVersion[]> {
    return db.select().from(documentVersions).where(eq(documentVersions.policyId, policyId));
  }

  async createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion> {
    const [newVersion] = await db.insert(documentVersions).values(version).returning();
    return newVersion;
  }

  // Trust Center / Verified Link operations (Phase 1)
  async createVerifiedLink(link: InsertVerifiedLink): Promise<VerifiedLink> {
    const linkData = {
      ...link,
      // Drizzle typing for JSON columns may surface as `Json[]`; force to schema's string[] contract.
      badges: (Array.isArray(link.badges) ? link.badges : []) as unknown as string[],
      documents: (Array.isArray(link.documents) ? link.documents : []) as unknown as Array<{
        title: string;
        url?: string;
      }>,
    };
    const [newLink] = await db.insert(verifiedLinks).values(linkData as any).returning();
    return newLink;
  }

  async getVerifiedLinkByToken(token: string): Promise<VerifiedLink | undefined> {
    const [found] = await db
      .select()
      .from(verifiedLinks)
      .where(eq(verifiedLinks.token, token));
    return found;
  }

  // Activity / audit logging
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const logData = {
      userId: log.userId,
      organizationId: log.organizationId,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? null,
      metadata: log.metadata ?? {},
    };

    const [created] = await db.insert(activityLogs).values(logData).returning();
    return created;
  }

  // Dashboard data
  async getDashboardMetrics(): Promise<{
    complianceOverview: { framework: string; percentage: number; status: string }[];
    recentActivities: { title: string; timestamp: string; type: string }[];
    riskScore: number;
    totalPolicies: number;
    pendingReviews: number;
  }> {
    const frameworks = await this.getComplianceFrameworks();
    const totalPoliciesResult = await db.select({ count: sql<number>`count(*)` }).from(policies);
    const riskAssessmentList = await this.getRiskAssessments();

    const complianceOverview = frameworks.map(framework => ({
      framework: framework.displayName,
      percentage: Number(framework.completionPercentage ?? 0),
      status: Number(framework.completionPercentage ?? 0) >= 80 ? 'compliant' : 'non-compliant'
    }));

    const recentActivities = [
      { title: 'Policy review completed', timestamp: new Date().toISOString(), type: 'policy' },
      { title: 'GDPR compliance check', timestamp: new Date().toISOString(), type: 'compliance' },
    ];

    const avgRiskScore = riskAssessmentList.length > 0 
      ? riskAssessmentList.reduce((sum, risk) => sum + risk.riskScore, 0) / riskAssessmentList.length 
      : 0;

    return {
      complianceOverview,
      recentActivities,
      riskScore: Math.round(avgRiskScore),
      totalPolicies: totalPoliciesResult[0].count,
      pendingReviews: 3
    };
  }
}
