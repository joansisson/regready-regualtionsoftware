import { Shield, Lock, Bot, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceCardProps {
  framework: string;
  percentage: number;
  status: string;
}

const statusConfig = {
  compliant: {
    icon: Shield,
    bgColor: "bg-success/10",
    textColor: "text-success",
    iconColor: "text-success",
    label: "Compliant",
    progressColor: "bg-success"
  },
  "in-progress": {
    icon: Lock,
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    iconColor: "text-warning",
    label: "In Progress",
    progressColor: "bg-warning"
  },
  "needs-attention": {
    icon: Bot,
    bgColor: "bg-error/10",
    textColor: "text-error",
    iconColor: "text-error",
    label: "Needs Attention",
    progressColor: "bg-error"
  }
} as const;

export default function ComplianceCard({ framework, percentage, status }: ComplianceCardProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig["in-progress"];
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", config.bgColor)}>
          <Icon className={cn("text-xl w-6 h-6", config.iconColor)} />
        </div>
        <span className={cn("px-2 py-1 text-xs font-medium rounded-full", config.bgColor, config.textColor)}>
          {config.label}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-neutral-900 mb-1">{percentage}%</h3>
      <p className="text-neutral-600 text-sm mb-2">{framework}</p>
      <div className="w-full bg-neutral-200 rounded-full h-2">
        <div 
          className={cn("h-2 rounded-full", config.progressColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
