import type { User } from "@shared/schema";
import type {
  GeneratedPolicy,
  PolicyGenerationRequest,
  RemediationSuggestRequest,
  RemediationSuggestResponse,
} from "./llmTypes";
import {
  validateGeminiKey,
  generatePolicy as generatePolicyGemini,
  analyzeComplianceRisk as analyzeComplianceRiskGemini,
  suggestRemediation as suggestRemediationGemini,
} from "./gemini";
import { decryptByokKey } from "./byokCrypto";

export type LLMProvider = "gemini";

export interface LLMKeyValidationResult {
  valid: boolean;
  message: string;
  last4?: string;
}

function getGeminiApiKeyForUser(user: User): string | undefined {
  const stored = user.geminiApiKeyEncrypted;
  if (!stored) return undefined;

  const decrypted = decryptByokKey(stored);
  return decrypted ?? undefined;
}

export async function validateLLMKey(
  _provider: LLMProvider,
  apiKey: string
): Promise<LLMKeyValidationResult> {
  return validateGeminiKey(apiKey);
}

export async function generatePolicy(
  request: PolicyGenerationRequest,
  user?: User | null
): Promise<GeneratedPolicy> {
  const apiKey = user ? getGeminiApiKeyForUser(user) : undefined;
  return generatePolicyGemini(request, apiKey);
}

export async function analyzeComplianceRisk(
  description: string,
  frameworks: string[],
  user?: User | null
): Promise<{
  riskLevel: string;
  riskScore: number;
  recommendations: string[];
  frameworkSpecificRisks: Record<string, string>;
}> {
  const apiKey = user ? getGeminiApiKeyForUser(user) : undefined;
  return analyzeComplianceRiskGemini(description, frameworks, apiKey);
}

export async function suggestRemediation(
  request: RemediationSuggestRequest,
  user?: User | null
): Promise<RemediationSuggestResponse> {
  const apiKey = user ? getGeminiApiKeyForUser(user) : undefined;
  return suggestRemediationGemini(request, apiKey);
}
