import OverviewTab from "@/components/dashboard/overview-tab";
import AnalyticsTab from "@/components/dashboard/analytics-tab";
import RecommendationsEngine from "@/components/compliance/recommendations-engine";
import ComplianceReportGenerator from "@/components/reports/compliance-report-generator";
import Header from "@/components/layout/header";
import { useNewPolicyModal } from "@/components/policy/new-policy-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Brain,
  FileDown,
} from "lucide-react";

export default function Dashboard() {
  const { setModeAndOpen } = useNewPolicyModal();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FCF7EF]">
      <Header
        title="Compliance Dashboard"
        description="RegReady Intelligence System • Secure Local Environment"
        onNewPolicyClick={() => setModeAndOpen("manual")}
      />

      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 bg-[#F5EFE6] p-1 border border-orange-100 rounded-xl shadow-inner">
            <TabsTrigger
              value="overview"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md font-bold transition-all text-slate-500"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md font-bold transition-all text-slate-500"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md font-bold transition-all text-slate-500"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-md font-bold transition-all text-slate-500"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <TabsContent value="overview">
              <div className="bg-white/40 rounded-3xl p-6 border border-white shadow-sm">
                <OverviewTab onNewPolicyClick={() => setModeAndOpen("ai")} />
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="bg-white/40 rounded-3xl p-6 border border-white shadow-sm">
                <AnalyticsTab />
              </div>
            </TabsContent>

            <TabsContent value="recommendations">
              <div className="bg-white/40 rounded-3xl p-6 border border-white shadow-sm">
                <RecommendationsEngine />
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <div className="bg-white/40 rounded-3xl p-6 border border-white shadow-sm">
                <ComplianceReportGenerator />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <footer className="px-8 py-4 border-t border-orange-100 flex justify-between items-center bg-[#F5EFE6]/50">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          RegReady v1.0.4 — Build 2026.04
        </span>
        <div className="flex gap-4 items-center">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase">
            Local Database Encrypted
          </span>
        </div>
      </footer>

    </div>
  );
}
