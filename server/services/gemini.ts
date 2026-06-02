import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  GeneratedPolicy,
  PolicyGenerationRequest,
  RemediationSuggestRequest,
  RemediationSuggestResponse,
  Recommendation,
  RecommendationGenerationInput,
} from "./llmTypes";

function buildUserGenerateContentPayload(text: string) {
  return {
    contents: [{ role: "user", parts: [{ text }] }],
  };
}

function parseJsonFromModelText(text: string): unknown {
  const raw = (text || "").trim();

  // Strip ```json ... ``` / ``` ... ``` fences if present
  const withoutFences = raw.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, "$1").trim();

  // Find the first {...} JSON object boundaries
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start >= 0 && end >= 0 && end > start) {
    const jsonLike = withoutFences.slice(start, end + 1);
    return JSON.parse(jsonLike);
  }

  // Fallback: attempt direct parse
  return JSON.parse(withoutFences);
}

export interface GeminiKeyValidationResult {
  valid: boolean;
  message: string;
  last4?: string;
}

function getGeminiKeyLast4(apiKey: string): string {
  return apiKey.slice(-4);
}

let cachedGeminiModelId: string | null = null;
let cachedGeminiModelIdApiKey: string | null = null;

async function listGeminiModelsViaRest(apiKey: string): Promise<string[]> {
  // Gemini API: list models
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini models.list failed: ${res.status} ${res.statusText} ${text}`.trim());
  }

  const body = (await res.json()) as { models?: Array<{ name?: string }> };

  const names =
    Array.isArray(body.models)
      ? body.models
          .map((m) => m?.name)
          .filter((n): n is string => typeof n === "string")
      : [];

  // names are like: "models/gemini-1.5-pro-latest"
  return names.map((n) => n.split("/").pop() || n);
}

async function createGeminiModel(apiKey?: string) {
  const resolvedApiKey = (apiKey || process.env.GEMINI_API_KEY)?.trim();
  if (!resolvedApiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const genAI = new GoogleGenerativeAI(resolvedApiKey);

  if (cachedGeminiModelId && cachedGeminiModelIdApiKey === resolvedApiKey) {
    return genAI.getGenerativeModel({ model: cachedGeminiModelId });
  }

  const preferred = ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest"];

  // Fetch available models via REST (required for correctness).
  // If this fails, we should NOT guess model IDs (those can be unsupported
  // for generateContent under your API version/config).
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

export async function validateGeminiKey(apiKey: string): Promise<GeminiKeyValidationResult> {
  const trimmedKey = apiKey.trim();

  // Local validation: enforce expected prefix.
  if (!trimmedKey.startsWith("AIza")) {
    return { valid: false, message: "Gemini API key must start with the 'AIza' prefix." };
  }

  try {
    // Gemini explicitly recommends using ListModels to validate keys.
    // If we can list models successfully, the key is valid.
    await listGeminiModelsViaRest(trimmedKey);

    return {
      valid: true,
      message: "Gemini API key validated successfully.",
      last4: getGeminiKeyLast4(trimmedKey),
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";

    // Normalize common invalid-key phrases for UX.
    const lowered = details.toLowerCase();
    const looksInvalid =
      lowered.includes("api key not valid") ||
      lowered.includes("api_key_invalid") ||
      lowered.includes("invalid api key") ||
      lowered.includes("key is not valid");

    return {
      valid: false,
      message: `Gemini API key rejected.${looksInvalid ? "" : " "} ${details}`,
    };
  }
}

export async function generatePolicy(
  request: PolicyGenerationRequest,
  apiKey?: string
): Promise<GeneratedPolicy> {
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
    const text = result.response.text();

    const parsed = JSON.parse(text || "{}") as Partial<GeneratedPolicy>;
    return {
      title: parsed.title || request.title,
      content: parsed.content || "Policy content could not be generated. Please try again.",
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      complianceNotes: (parsed.complianceNotes && typeof parsed.complianceNotes === "object")
        ? (parsed.complianceNotes as Record<string, string>)
        : {},
    };
  } catch (error) {
    console.error("Error generating policy (Gemini):", error);
    throw new Error("Failed to generate policy with Gemini. Please check your Gemini API key and try again.");
  }
}

export async function analyzeComplianceRisk(
  description: string,
  frameworks: string[],
  apiKey?: string
): Promise<{
  riskLevel: string;
  riskScore: number;
  recommendations: string[];
  frameworkSpecificRisks: Record<string, string>;
}> {
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
    const text = result.response.text();

    const parsed = parseJsonFromModelText(text || "{}") as Partial<{
      riskLevel: string;
      riskScore: number;
      recommendations: string[];
      frameworkSpecificRisks: Record<string, string>;
    }>;

    return {
      riskLevel: parsed.riskLevel || "medium",
      riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : 50,
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      frameworkSpecificRisks: parsed.frameworkSpecificRisks || {},
    };
  } catch (error) {
    console.error("Error analyzing compliance risk (Gemini):", error);
    throw new Error("Failed to analyze compliance risk with Gemini. Please check your Gemini API key and try again.");
  }
}

export async function suggestRemediation(
  request: RemediationSuggestRequest,
  apiKey?: string
): Promise<RemediationSuggestResponse> {
  const model = await createGeminiModel(apiKey);

  const techStackText = (request.techStack ?? []).join(", ") || "unknown";

  const proTipAnswersText = request.proTipAnswers
    ? [
        request.proTipAnswers.auditBoundary
          ? `- Audit boundary: handlesPIIorPHI=${
              request.proTipAnswers.auditBoundary.handlesPIIorPHI ?? "unknown"
            }, hasPhysicalOffices=${String(request.proTipAnswers.auditBoundary.hasPhysicalOffices ?? "unknown")}`
          : `- Audit boundary: not provided`,
        request.proTipAnswers.evidencePipeline
          ? `- Evidence pipeline: primaryTicketingSystem=${
              request.proTipAnswers.evidencePipeline.primaryTicketingSystem ?? "unknown"
            }, whereSystemLogsAreCentralized=${
              request.proTipAnswers.evidencePipeline.whereSystemLogsAreCentralized ?? "unknown"
            }`
          : `- Evidence pipeline: not provided`,
        request.proTipAnswers.accessControl
          ? `- Access control: timeToRevokeOffboarding=${
              request.proTipAnswers.accessControl.timeToRevokeOffboarding ?? "unknown"
            }, customTimeToRevoke=${request.proTipAnswers.accessControl.customTimeToRevoke ?? "unknown"}, authMethod=${request.proTipAnswers.accessControl.authMethod ?? "unknown"}`
          : `- Access control: not provided`,
        request.proTipAnswers.infrastructureDetail
          ? `- Infrastructure detail: usesInfrastructureAsCode=${
              String(request.proTipAnswers.infrastructureDetail.usesInfrastructureAsCode ?? "unknown")
            }, dataRetentionPolicyDuration=${
              request.proTipAnswers.infrastructureDetail.dataRetentionPolicyDuration ?? "unknown"
            }`
          : `- Infrastructure detail: not provided`,
      ].join("\n")
    : `- Pro-tip answers: not provided`;

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
    const text = result.response.text();
    const parsed = JSON.parse(text || "{}") as Partial<RemediationSuggestResponse>;

    return {
      diffSummary: parsed.diffSummary || "No diff could be generated; please review the suggested patch text.",
      suggestedPolicyPatch: parsed.suggestedPolicyPatch || request.policyText || "",
      technicalTasks: Array.isArray(parsed.technicalTasks)
        ? parsed.technicalTasks.map((t) => ({
            title: t?.title || "Technical task",
            checklist: Array.isArray(t?.checklist) ? t!.checklist.map(String) : [],
          }))
        : [],
    };
  } catch (error) {
    console.error("Error suggesting remediation (Gemini):", error);
    throw new Error("Failed to suggest remediation with Gemini. Please check your Gemini API key and try again.");
  }
}
