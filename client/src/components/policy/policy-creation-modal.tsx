import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Wand2, FileText } from "lucide-react";
import { useForm } from "react-hook-form";

import { policyGenerateInputSchema, type PolicyGenerateInputValues } from "@/lib/policy-schema";

interface PolicyCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const frameworkOptions = [
  { id: "gdpr", label: "GDPR" },
  { id: "soc2", label: "SOC 2" },
  { id: "ai-act", label: "EU AI Act" },
] as const;

type FrameworkId = PolicyGenerateInputValues["frameworks"][number];

export default function PolicyCreationModal({ open, onOpenChange }: PolicyCreationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    setValue,
    watch,
    handleSubmit,
    reset,
  } = useForm<PolicyGenerateInputValues>({
    defaultValues: {
      title: "",
      type: "",
      description: "",
      frameworks: [],
    },
  });

  const title = watch("title");
  const type = watch("type");
  const description = watch("description");
  const frameworks = watch("frameworks");

  const resetForm = () => {
    reset({
      title: "",
      type: "",
      description: "",
      frameworks: [],
    });
  };

  const handleFrameworkChange = (frameworkId: FrameworkId, checked: boolean) => {
    const currentFrameworks = Array.isArray(frameworks) ? frameworks : [];
    const next = checked
      ? [...currentFrameworks, frameworkId]
      : currentFrameworks.filter((item) => item !== frameworkId);

    setValue("frameworks", next, {
      shouldValidate: false,
      shouldDirty: true,
    });
  };

  const generatePolicyMutation = useMutation({
    mutationFn: async (data: PolicyGenerateInputValues) => {
      const response = await apiRequest("POST", "/api/policies/generate", data);
      return response.json();
    },
    onSuccess: async (generatedPolicy, variables) => {
      const policyData = {
        title: generatedPolicy.title,
        type: variables.type,
        description: variables.description,
        content: generatedPolicy.content,
        frameworks: variables.frameworks,
        status: "under-review",
        createdBy: "Current User",
        version: "1.0",
      };

      await apiRequest("POST", "/api/policies", policyData);

      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({
        title: "Policy Generated Successfully",
        description: "AI-powered policy draft has been created and saved.",
      });

      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Generation failed";
      toast({
        title: "Generation Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const createManualPolicyMutation = useMutation({
    mutationFn: async (data: PolicyGenerateInputValues) => {
      const policyData = {
        title: data.title,
        type: data.type,
        description: data.description,
        frameworks: data.frameworks,
        content: "",
        status: "draft",
        createdBy: "Current User",
        version: "1.0",
      };

      const response = await apiRequest("POST", "/api/policies", policyData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      toast({
        title: "Policy Created",
        description: "Policy template has been created successfully.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Creation failed";
      toast({
        title: "Creation Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const validateWithZod = (values: PolicyGenerateInputValues) => {
    const parsed = policyGenerateInputSchema.safeParse(values);
    if (parsed.success) return parsed.data;

    const firstIssue = parsed.error.issues[0];
    toast({
      title: "Validation Error",
      description: firstIssue?.message ?? "Please check your inputs and try again.",
      variant: "destructive",
    });

    return null;
  };

  const submitGenerate = handleSubmit(async (values) => {
    const parsed = validateWithZod(values);
    if (!parsed) return;

    setIsSubmitting(true);
    try {
      generatePolicyMutation.mutate(parsed);
    } finally {
      setIsSubmitting(false);
    }
  });

  const submitManual = handleSubmit(async (values) => {
    const parsed = validateWithZod(values);
    if (!parsed) return;

    setIsSubmitting(true);
    try {
      createManualPolicyMutation.mutate(parsed);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-black">
        <DialogHeader>
          <DialogTitle className="text-black">Create New Policy</DialogTitle>
          <DialogDescription className="text-black/70">
            Fill out the policy details and choose compliance frameworks to generate or create a draft.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6 text-black" onSubmit={(event) => event.preventDefault()}>
          <div>
            <Label htmlFor="type" className="text-black">Policy Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setValue("type", value, { shouldDirty: true })}
            >
              <SelectTrigger className="bg-white text-black border-gray-300 hover:bg-white">
                <SelectValue placeholder="Select a policy type" />
              </SelectTrigger>
              <SelectContent className="bg-white text-black border-gray-300">
                <SelectItem value="privacy" className="text-black">Privacy Policy</SelectItem>
                <SelectItem value="security" className="text-black">Security Policy</SelectItem>
                <SelectItem value="data-processing" className="text-black">Data Processing Policy</SelectItem>
                <SelectItem value="ai-governance" className="text-black">AI Governance Policy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title" className="text-black">Policy Title</Label>
            <Input
              id="title"
              placeholder="Enter policy title"
              value={title}
              onChange={(event) => setValue("title", event.target.value, { shouldDirty: true })}
              className="bg-white text-black border-gray-300 placeholder:text-gray-500 focus-visible:ring-black"
            />
          </div>

          <div>
            <Label className="text-black">Framework Compliance</Label>
            <div className="space-y-2 mt-2">
              {frameworkOptions.map((framework) => (
                <div key={framework.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={framework.id}
                    checked={(frameworks ?? []).includes(framework.id)}
                    onCheckedChange={(checked) => handleFrameworkChange(framework.id, Boolean(checked))}
                  />
                  <Label htmlFor={framework.id} className="text-black">
                    {framework.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-black">Description</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Describe the policy purpose and scope"
              value={description}
              onChange={(event) => setValue("description", event.target.value, { shouldDirty: true })}
              className="bg-white text-black border-gray-300 placeholder:text-gray-500 focus-visible:ring-black"
            />
          </div>

          <div className="flex items-center space-x-4 pt-4">
            <Button
              type="button"
              onClick={submitGenerate}
              disabled={generatePolicyMutation.isPending || isSubmitting}
              className="flex-1"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {generatePolicyMutation.isPending || isSubmitting ? "Generating..." : "Generate with AI"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={submitManual}
              disabled={createManualPolicyMutation.isPending || isSubmitting}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              {createManualPolicyMutation.isPending || isSubmitting ? "Creating..." : "Create Manually"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
