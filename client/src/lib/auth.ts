export interface LocalUser {
  id: number;
  email: string;
  username: string;
  role?: string;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

export interface ActivationProfile {
  fullName: string;
  email: string;
  password: string;
}

export type WorkspaceAuditBoundary = {
  handlesPIIorPHI?: "none" | "pii" | "phi" | "both";
  hasPhysicalOffices?: boolean;
};

export type WorkspaceEvidencePipeline = {
  primaryTicketingSystem?: string;
  whereSystemLogsAreCentralized?: string;
};

export type WorkspaceAccessControl = {
  timeToRevokeOffboarding?: "same-day" | "24-hours" | "48-hours" | "custom";
  customTimeToRevoke?: string;

  authMethod?: "password-manager" | "sso" | "both" | "other";
};

export type WorkspaceInfrastructureDetail = {
  usesInfrastructureAsCode?: boolean;
  dataRetentionPolicyDuration?: string;
};

export type WorkspaceProTipAnswers = {
  auditBoundary?: WorkspaceAuditBoundary;
  evidencePipeline?: WorkspaceEvidencePipeline;
  accessControl?: WorkspaceAccessControl;
  infrastructureDetail?: WorkspaceInfrastructureDetail;
};

export interface WorkspaceProfile {
  /**
   * Company Profile (who)
   */
  legalName: string;
  industry: string;
  /**
   * Optional company size (used for more tailored remediation)
   */
  companySize?: string;
  headquarters: string;

  /**
   * Target Frameworks (goal)
   * Example values: ["SOC2", "GDPR", "EU_AI_ACT"]
   */
  targetFrameworks: string[];

  /**
   * Tech stack inventory (environment)
   * We store vendor/tool names that later get injected into prompts.
   */
  techStack: string[];

  /**
   * Compliance point of contact (sign-off owner)
   */
  pointOfContact: {
    name: string;
    role: string;
    email?: string;
  };

  /**
   * Pro-tip Q&A that improves AI remediation precision.
   * These are optional so workspace setup remains low-friction.
   */
  proTipAnswers?: WorkspaceProTipAnswers;
}

const USER_STORAGE_KEY = "regready_user";
const SESSION_USER_STORAGE_KEY = "regready_session_user";
const GEMINI_KEY_STORAGE_KEY = "regready_gemini_api_key";
const LLM_PROVIDER_STORAGE_KEY = "regready_llm_provider";
const ACTIVATION_STORAGE_KEY = "regready_device_activated";
const ACTIVATION_PROFILE_STORAGE_KEY = "regready_activation_profile";
const WORKSPACE_PROFILE_STORAGE_KEY = "regready_workspace_profile";

function readJson<T>(key: string): T | null {
  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export function getUser(): LocalUser | null {
  return readJson<LocalUser>(SESSION_USER_STORAGE_KEY) ?? readJson<LocalUser>(USER_STORAGE_KEY);
}

export function setUser(user: LocalUser): void {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getSessionUser(): LocalUser | null {
  return readJson<LocalUser>(SESSION_USER_STORAGE_KEY);
}

export function setSessionUser(user: LocalUser): void {
  window.localStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearSessionUser(): void {
  window.localStorage.removeItem(SESSION_USER_STORAGE_KEY);
}

export function getStoredActivationStatus(): boolean {
  return window.localStorage.getItem(ACTIVATION_STORAGE_KEY) === "true";
}

export function setStoredActivationStatus(isActivated: boolean): void {
  window.localStorage.setItem(ACTIVATION_STORAGE_KEY, isActivated ? "true" : "false");
}

export function logout(): void {
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_USER_STORAGE_KEY);
  window.localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
  window.localStorage.removeItem(LLM_PROVIDER_STORAGE_KEY);
  window.location.href = "/";
}

export function isAdmin(): boolean {
  return getUser()?.role === "admin";
}

export type LLMProvider = "gemini";

export function getStoredLLMProvider(): LLMProvider {
  // Gemini-only system: keep persisted value for backwards compatibility but always return "gemini".
  window.localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, "gemini");
  return "gemini";
}

export function setStoredLLMProvider(_provider: LLMProvider): void {
  window.localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, "gemini");
}

export function clearStoredLLMProvider(): void {
  window.localStorage.removeItem(LLM_PROVIDER_STORAGE_KEY);
}

export function getStoredGeminiKey(): string {
  return window.localStorage.getItem(GEMINI_KEY_STORAGE_KEY) || "";
}

export function setStoredGeminiKey(apiKey: string): void {
  window.localStorage.setItem(GEMINI_KEY_STORAGE_KEY, apiKey);
}

export function clearStoredGeminiKey(): void {
  window.localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
}

export function getStoredActivationProfile(): ActivationProfile | null {
  return readJson<ActivationProfile>(ACTIVATION_PROFILE_STORAGE_KEY);
}

export function setStoredActivationProfile(profile: ActivationProfile): void {
  window.localStorage.setItem(ACTIVATION_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function getStoredWorkspaceProfile(): WorkspaceProfile | null {
  return readJson<WorkspaceProfile>(WORKSPACE_PROFILE_STORAGE_KEY);
}

export function setStoredWorkspaceProfile(profile: WorkspaceProfile): void {
  window.localStorage.setItem(WORKSPACE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearStoredWorkspaceProfile(): void {
  window.localStorage.removeItem(WORKSPACE_PROFILE_STORAGE_KEY);
}

export function isWorkspaceProfileComplete(profile: WorkspaceProfile | null): boolean {
  if (!profile) return false;

  const hasBasics =
    profile.legalName.trim().length > 0 &&
    profile.industry.trim().length > 0 &&
    profile.headquarters.trim().length > 0;

  const hasGoals = Array.isArray(profile.targetFrameworks) && profile.targetFrameworks.length > 0;
  const hasStack = Array.isArray(profile.techStack) && profile.techStack.length > 0;

  const poc = profile.pointOfContact;
  const hasContact = poc?.name?.trim().length > 0 && poc?.role?.trim().length > 0;

  return hasBasics && hasGoals && hasStack && hasContact;
}
