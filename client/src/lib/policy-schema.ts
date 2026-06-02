import * as z from "zod";

const policyFrameworkIds = ["gdpr", "soc2", "ai-act"] as const;

export const policyGenerateInputSchema = z.object({
  // Matches backend: title: z.string().min(1)
  title: z
    .string()
    .min(1, { message: "Please enter a policy title." })
    .max(100, { message: "Title must be under 100 characters." }),

  // Matches backend: type: z.string().min(1)
  // UI values currently: "privacy" | "security" | "data-processing" | "ai-governance"
  type: z
    .string()
    .min(1, { message: "Please select a policy type." }),

  // Matches backend: description: z.string().min(1)
  description: z
    .string()
    .min(1, { message: "Please enter a policy description." })
    .max(500, { message: "Description must be under 500 characters." }),

  // UI sends framework IDs: ["gdpr" | "soc2" | "ai-act", ...]
  // Backend accepts: frameworks: z.array(z.string())
  frameworks: z
    .array(z.enum(policyFrameworkIds))
    .min(1, { message: "Please select at least one compliance framework." }),
});

export type PolicyGenerateInputValues = z.infer<typeof policyGenerateInputSchema>;

// Backward-compatible re-exports (if anything imports old names)
export const policySchema = policyGenerateInputSchema;
export type PolicyFormValues = PolicyGenerateInputValues;
