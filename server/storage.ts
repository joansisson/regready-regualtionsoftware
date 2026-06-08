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
} from "@shared/schema";
import { DatabaseStorage } from "./database-storage";

export interface IStorage {
  // User operations
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserStripeInfo(id: number, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined>;
  verifyPassword(email: string, password: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  generateAuthToken(userId: number): string;

  // Policy operations (tenant-scoped by organizationId)
  getPolicies(organizationId?: number): Promise<Policy[]>;
  getPolicy(id: number, organizationId?: number): Promise<Policy | undefined>;
  createPolicy(policy: InsertPolicy): Promise<Policy>;
  updatePolicy(
    id: number,
    policy: Partial<InsertPolicy>,
    organizationId?: number
  ): Promise<Policy | undefined>;
  deletePolicy(id: number, organizationId?: number): Promise<boolean>;

  // Compliance framework operations
  getComplianceFrameworks(): Promise<ComplianceFramework[]>;
  getComplianceFramework(id: number): Promise<ComplianceFramework | undefined>;
  createComplianceFramework(framework: InsertComplianceFramework): Promise<ComplianceFramework>;
  updateComplianceFramework(id: number, framework: Partial<InsertComplianceFramework>): Promise<ComplianceFramework | undefined>;

  // Compliance check operations
  getComplianceChecks(frameworkId?: number): Promise<ComplianceCheck[]>;
  createComplianceCheck(check: InsertComplianceCheck): Promise<ComplianceCheck>;
  updateComplianceCheck(id: number, check: Partial<InsertComplianceCheck>): Promise<ComplianceCheck | undefined>;

  // Vendor operations
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, vendor: Partial<InsertVendor>): Promise<Vendor | undefined>;
  deleteVendor(id: number): Promise<boolean>;

  // Risk assessment operations (tenant-scoped by organizationId)
  getRiskAssessments(organizationId?: number): Promise<RiskAssessment[]>;
  getRiskAssessment(id: number, organizationId?: number): Promise<RiskAssessment | undefined>;
  createRiskAssessment(assessment: InsertRiskAssessment, organizationId?: number): Promise<RiskAssessment>;
  updateRiskAssessment(
    id: number,
    assessment: Partial<InsertRiskAssessment>,
    organizationId?: number
  ): Promise<RiskAssessment | undefined>;

  // Audit report operations (tenant-scoped by organizationId)
  getAuditReports(organizationId?: number): Promise<AuditReport[]>;
  getAuditReport(id: number, organizationId?: number): Promise<AuditReport | undefined>;
  createAuditReport(report: InsertAuditReport, organizationId?: number): Promise<AuditReport>;

  // Document version operations
  getDocumentVersions(policyId: number): Promise<DocumentVersion[]>;
  createDocumentVersion(version: InsertDocumentVersion): Promise<DocumentVersion>;

  // Trust Center / Verified Link operations (Phase 1)
  createVerifiedLink(link: InsertVerifiedLink): Promise<VerifiedLink>;
  getVerifiedLinkByToken(token: string): Promise<VerifiedLink | undefined>;

  // Activity / audit logging
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Dashboard data
  getDashboardMetrics(): Promise<{
    complianceOverview: { framework: string; percentage: number; status: string }[];
    recentActivities: { title: string; timestamp: string; type: string }[];
    riskScore: number;
    totalPolicies: number;
    pendingReviews: number;
  }>;
}

// Async factory: the storage constructor is synchronous but seed data
// initialization is deferred. Call createStorage() before using any routes.
let _storage: DatabaseStorage | null = null;

export async function createStorage(): Promise<DatabaseStorage> {
  if (!_storage) {
    _storage = new DatabaseStorage();
    await _storage.initialize();
  }
  return _storage;
}

// Backward-compat for imports that reference `storage` directly.
// This will be populated lazily by the first call to createStorage().
// Prefer createStorage() for new code to guarantee seed data is ready.
export const storage: DatabaseStorage = new Proxy({} as DatabaseStorage, {
  get(_target, prop: keyof DatabaseStorage) {
    if (!_storage) {
      throw new Error(
        'DatabaseStorage not initialized. Call await createStorage() before accessing storage.' +
        ' This happens when a module imports `storage` at top-level before server boot completes.'
      );
    }
    const value = (_storage as any)[prop];
    return typeof value === 'function' ? value.bind(_storage) : value;
  },
});
