import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Lightbulb,
  Target,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AutoRemediationCopilot from "@/components/compliance/auto-remediation-copilot";
import RiskAssessmentCopilot from "@/components/compliance/risk-assessment-copilot";

type Recommendation = {
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
};

type FrameworkRow = {
  id: number;
  name: string;
  displayName: string;
  completionPercentage: number;
};

export default function RecommendationsEngine() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: frameworks = [] } = useQuery<FrameworkRow[]>({
    queryKey: ["/api/compliance-frameworks"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/compliance-frameworks");
      return res.json();
    },
  });

  const { data: recommendationsRaw = [] } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/recommendations");
      return res.json();
    },
  });

  const recommendations = recommendationsRaw ?? [];

  const filteredRecommendations = recommendations.filter((rec) => {
    const categoryMatch = selectedCategory === "all" || rec.category === selectedCategory;
    const priorityMatch = selectedPriority === "all" || rec.priority === selectedPriority;
    return categoryMatch && priorityMatch;
  });

  const recsByFramework = useMemo(() => {
    const map = new Map<string, Recommendation[]>();
    for (const rec of recommendations) {
      for (const fw of rec.frameworks ?? []) {
        const existing = map.get(fw) ?? [];
        existing.push(rec);
        map.set(fw, existing);
      }
    }
    return map;
  }, [recommendations]);

  const insights = useMemo(() => {
    return frameworks.map((fw) => {
      const currentScore = Math.round(fw.completionPercentage ?? 0);
      const targetScore = 100;

      const recs = recsByFramework.get(fw.displayName) ?? [];
      const gaps = recs.slice(0, 2).map((r) => r.title);
      const quickWins = recs
        .slice(0, 2)
        .map((r) => r.implementationSteps?.[1] ?? r.implementationSteps?.[0] ?? "")
        .filter(Boolean);

      return {
        framework: fw.displayName,
        currentScore,
        targetScore,
        gaps,
        quickWins,
      };
    });
  }, [frameworks, recsByFramework]);

  const implementRecommendationMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      await apiRequest("POST", `/api/recommendations/${recommendationId}/implement`);
    },
    onSuccess: () => {
      toast({
        title: "Implementation Started",
        description: "Recommendation has been added to your action plan.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
    onError: () => {
      toast({
        title: "Implementation Failed",
        description: "Failed to start recommendation implementation.",
        variant: "destructive",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "security":
        return <Target className="h-4 w-4" />;
      case "privacy":
        return <CheckCircle className="h-4 w-4" />;
      case "compliance":
        return <Clock className="h-4 w-4" />;
      case "governance":
        return <Brain className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            AI Compliance Insights
          </h2>
          <p className="text-neutral-600">Personalized recommendations to improve your compliance posture</p>
        </div>

        <Button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
            queryClient.invalidateQueries({ queryKey: ["/api/compliance-frameworks"] });
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Zap className="h-4 w-4 mr-2" />
          Refresh Insights
        </Button>
      </div>

      {/* Compliance Score Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {insights.map((insight) => (
          <Card key={insight.framework} className="border-l-4 border-l-blue-500 min-w-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{insight.framework}</CardTitle>
                <Badge variant="outline" className="text-sm">
                  {insight.currentScore}% Complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-neutral-600">Progress to Target</span>
                    <span className="text-sm font-medium">{insight.targetScore}%</span>
                  </div>
                  <Progress value={insight.currentScore} className="h-2" />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-neutral-900 mb-2">Key Gaps:</h4>
                  {insight.gaps.length > 0 ? (
                    <ul className="space-y-1">
                      {insight.gaps.map((gap, index) => (
                        <li key={index} className="text-xs text-neutral-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                          {gap}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-neutral-500">No gaps flagged.</div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-neutral-900 mb-2">Quick Wins:</h4>
                  {insight.quickWins.length > 0 ? (
                    <ul className="space-y-1">
                      {insight.quickWins.map((win, index) => (
                        <li key={index} className="text-xs text-neutral-600 flex items-center gap-1">
                          <Star className="h-3 w-3 text-green-500 flex-shrink-0" />
                          {win}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-neutral-500">No quick wins available.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk Assessment */}
      <div className="mt-6">
        <RiskAssessmentCopilot />
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Button variant={selectedCategory === "all" ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory("all")}>
            All Categories
          </Button>
          <Button
            variant={selectedCategory === "security" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("security")}
          >
            Security
          </Button>
          <Button
            variant={selectedCategory === "privacy" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("privacy")}
          >
            Privacy
          </Button>
          <Button
            variant={selectedCategory === "compliance" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("compliance")}
          >
            Compliance
          </Button>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button
            variant={selectedPriority === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPriority("all")}
          >
            All Priorities
          </Button>
          <Button
            variant={selectedPriority === "high" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPriority("high")}
          >
            High
          </Button>
          <Button
            variant={selectedPriority === "medium" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPriority("medium")}
          >
            Medium
          </Button>
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRecommendations.map((recommendation) => (
          <Card key={recommendation.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(recommendation.category)}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{recommendation.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getPriorityColor(recommendation.priority)} variant="secondary">
                        {recommendation.priority.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-neutral-500 capitalize">{recommendation.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <p className="text-sm text-neutral-600 mb-4 line-clamp-3">{recommendation.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{recommendation.impact}%</div>
                  <div className="text-xs text-neutral-500">Impact</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{recommendation.effort}%</div>
                  <div className="text-xs text-neutral-500">Effort</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{recommendation.timeline}</div>
                  <div className="text-xs text-neutral-500">Timeline</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-neutral-900 mb-2">Frameworks:</div>
                <div className="flex gap-1">
                  {recommendation.frameworks.map((framework) => (
                    <Badge key={framework} variant="outline" className="text-xs">
                      {framework}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-neutral-900 mb-2">Risk Reduction:</div>
                <div className="flex items-center gap-2">
                  <Progress value={recommendation.riskReduction} className="flex-1 h-2" />
                  <span className="text-sm font-medium">{recommendation.riskReduction}%</span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => implementRecommendationMutation.mutate(recommendation.id)}
                  disabled={implementRecommendationMutation.isPending}
                  className="flex-1"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Implement
                </Button>

                <Button variant="outline" className="flex-1">
                  View Details
                </Button>

                <div className="flex-1 min-w-[140px]">
                  <AutoRemediationCopilot
                    frameworkControl={`${recommendation.frameworks.join(", ")} — ${recommendation.title}`}
                    label="Fix It"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">No recommendations found</h3>
            <p className="text-neutral-600 mb-4">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
