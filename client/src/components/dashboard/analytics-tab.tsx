import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  FileText,
  Shield,
  Activity
} from "lucide-react";

interface AnalyticsData {
  complianceScores: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
  };
  policyMetrics: {
    total: number;
    approved: number;
    pending: number;
    overdue: number;
  };
  teamActivity: {
    activeUsers: number;
    documentsCreated: number;
    reviewsCompleted: number;
    avgResponseTime: string;
  };
  frameworkProgress: Array<{
    name: string;
    current: number;
    target: number;
    deadline: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    compliance: number;
    policies: number;
    risks: number;
  }>;
}

export default function AnalyticsTab() {
  const { data: analytics, isLoading } = useQuery<Partial<AnalyticsData>>({
    queryKey: ["/api/dashboard/analytics"],
  });

  const mockAnalytics: AnalyticsData = {
    complianceScores: {
      current: 78,
      previous: 72,
      trend: 'up'
    },
    policyMetrics: {
      total: 24,
      approved: 18,
      pending: 4,
      overdue: 2
    },
    teamActivity: {
      activeUsers: 8,
      documentsCreated: 12,
      reviewsCompleted: 15,
      avgResponseTime: '2.4 days'
    },
    frameworkProgress: [
      { name: 'GDPR', current: 85, target: 95, deadline: '2025-09-01' },
      { name: 'SOC 2', current: 72, target: 90, deadline: '2025-10-15' },
      { name: 'EU AI Act', current: 45, target: 80, deadline: '2025-12-01' }
    ],
    monthlyTrends: [
      { month: 'Jan', compliance: 65, policies: 18, risks: 8 },
      { month: 'Feb', compliance: 68, policies: 20, risks: 7 },
      { month: 'Mar', compliance: 71, policies: 22, risks: 6 },
      { month: 'Apr', compliance: 74, policies: 23, risks: 5 },
      { month: 'May', compliance: 76, policies: 24, risks: 4 },
      { month: 'Jun', compliance: 78, policies: 24, risks: 3 }
    ]
  };

  const displayData: AnalyticsData = {
    complianceScores: {
      ...mockAnalytics.complianceScores,
      ...(analytics?.complianceScores ?? {}),
    },
    policyMetrics: {
      ...mockAnalytics.policyMetrics,
      ...(analytics?.policyMetrics ?? {}),
    },
    teamActivity: {
      ...mockAnalytics.teamActivity,
      ...(analytics?.teamActivity ?? {}),
    },
    frameworkProgress: analytics?.frameworkProgress ?? mockAnalytics.frameworkProgress,
    monthlyTrends: analytics?.monthlyTrends ?? mockAnalytics.monthlyTrends,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-neutral-600" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-neutral-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-neutral-600">Compliance Score</span>
              </div>
              {getTrendIcon(displayData.complianceScores.trend)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{displayData.complianceScores.current}%</span>
              <span className={`text-sm ${getTrendColor(displayData.complianceScores.trend)}`}>
                {displayData.complianceScores.trend === 'up' ? '+' : ''}
                {displayData.complianceScores.current - displayData.complianceScores.previous}%
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">vs. last month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-neutral-600">Active Policies</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{displayData.policyMetrics.approved}</span>
              <span className="text-sm text-neutral-500">/ {displayData.policyMetrics.total}</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">approved policies</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-neutral-600">Team Activity</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{displayData.teamActivity.activeUsers}</span>
              <span className="text-sm text-neutral-500">users</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">active this week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-neutral-600">Response Time</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{displayData.teamActivity.avgResponseTime}</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">avg review time</p>
          </CardContent>
        </Card>
      </div>

      {/* Framework Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Framework Progress Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {displayData.frameworkProgress.map((framework) => (
            <div key={framework.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{framework.name}</span>
                  <span className="text-sm text-neutral-500 ml-2">
                    Target: {framework.target}% by {new Date(framework.deadline).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{framework.current}%</span>
                  <Badge 
                    variant={framework.current >= framework.target * 0.8 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {framework.current >= framework.target * 0.8 ? "On Track" : "Behind"}
                  </Badge>
                </div>
              </div>
              <Progress value={framework.current} className="h-2" />
              <div className="text-xs text-neutral-500">
                {framework.target - framework.current}% remaining to target
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compliance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {displayData.monthlyTrends.slice(-6).map((trend, index) => (
                <div key={trend.month} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{trend.month} 2025</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">{trend.compliance}%</span>
                    </div>
                    <div className="w-20 bg-neutral-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${trend.compliance}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Policy Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{displayData.policyMetrics.approved}</span>
                  <div className="w-20 bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(displayData.policyMetrics.approved / displayData.policyMetrics.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Pending Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{displayData.policyMetrics.pending}</span>
                  <div className="w-20 bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${(displayData.policyMetrics.pending / displayData.policyMetrics.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{displayData.policyMetrics.overdue}</span>
                  <div className="w-20 bg-neutral-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${(displayData.policyMetrics.overdue / displayData.policyMetrics.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {displayData.teamActivity.documentsCreated}
              </div>
              <div className="text-sm text-neutral-600">Documents Created</div>
              <div className="text-xs text-neutral-500 mt-1">this month</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {displayData.teamActivity.reviewsCompleted}
              </div>
              <div className="text-sm text-neutral-600">Reviews Completed</div>
              <div className="text-xs text-neutral-500 mt-1">this month</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {Math.round((displayData.teamActivity.reviewsCompleted / displayData.teamActivity.documentsCreated) * 100)}%
              </div>
              <div className="text-sm text-neutral-600">Review Rate</div>
              <div className="text-xs text-neutral-500 mt-1">completion rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
