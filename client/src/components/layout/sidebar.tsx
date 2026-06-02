import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getUser, logout, isAdmin, type LLMProvider } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logo from "@assets/regready-logo.png";
import { 
  ChartPie, 
  FileText, 
  ClipboardCheck, 
  AlertTriangle, 
  Users, 
  History, 
  Folder,
  Shield,
  Settings,
  LogOut,
  User,
  Crown
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard/overview", icon: ChartPie },
  { name: "Policy Management", href: "/dashboard/policies", icon: FileText },
  { name: "Compliance Frameworks", href: "/dashboard/frameworks", icon: ClipboardCheck },
  { name: "Risk Assessment", href: "/dashboard/risk", icon: AlertTriangle },
  { name: "Vendor Management", href: "/dashboard/vendors", icon: Users },
  { name: "Audit Reports", href: "/dashboard/reports", icon: History },
  { name: "Document Library", href: "/dashboard/documents", icon: Folder },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const user = getUser();

  const [apiStatus, setApiStatus] = useState<{
    provider?: LLMProvider;
    hasApiKey?: boolean;
    isValidated?: boolean;
    last4?: string | null;
    validatedAt?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkApiStatus() {
      try {
        const response = await fetch("/api/user/settings/api-key/validate");
        if (!response.ok) return;

        const data = (await response.json()) as {
          provider: LLMProvider;
          hasApiKey: boolean;
          isValidated: boolean;
          last4: string | null;
          validatedAt: string | null;
          message?: string;
        };

        if (!cancelled) setApiStatus(data);
      } catch {
        // ignore
      }
    }

    // Initial fetch
    checkApiStatus();

    // Event-driven refresh (so we don't poll/spam)
    const onApiStatusUpdated = () => {
      void checkApiStatus();
    };

    window.addEventListener("regready:api-status-updated", onApiStatusUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("regready:api-status-updated", onApiStatusUpdated);
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  const systemReady = Boolean(apiStatus?.isValidated);
  const systemReadyLabel = systemReady ? "System Ready" : "Not configured";

  return (
    <div className="w-64 bg-white shadow-lg border-r border-neutral-200 flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <img 
            src={logo} 
            alt="RegReady Logo" 
            className="w-12 h-9 object-contain"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-neutral-900">RegReady</h1>
            <p className="text-xs text-neutral-500">Compliance Platform</p>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  systemReady ? "bg-emerald-500" : "bg-neutral-300",
                )}
              />
              <p className="text-xs text-neutral-600">
                {systemReadyLabel}
                {apiStatus?.provider ? ` • ${apiStatus.provider}` : ""}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const normalizedLocation = (location || "").split("?")[0];
          const isActive =
            normalizedLocation === item.href || normalizedLocation.startsWith(`${item.href}/`);
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer border border-transparent",
                  isActive
                    ? "bg-neutral-100 text-neutral-900 font-semibold border-neutral-200"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border-transparent"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center space-x-3 px-3 py-2 rounded-lg mb-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900">{user?.username || 'User'}</p>
            <p className="text-xs text-neutral-500 capitalize">{user?.subscriptionTier || 'Free'} Plan</p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="w-full justify-start text-neutral-600 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
