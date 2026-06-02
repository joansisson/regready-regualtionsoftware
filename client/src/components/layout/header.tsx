import { Button } from "@/components/ui/button";
import { Plus, Bell, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title: string;
  description?: string;
  onNewPolicyClick?: () => void;
}

export default function Header({ title, description, onNewPolicyClick }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return (
    <header className="bg-emerald-600 text-black shadow-sm border-b border-emerald-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">{title}</h2>
          {description && <p className="text-black/90 mt-1">{description}</p>}
        </div>

        <div className="flex items-center space-x-4">
          {onNewPolicyClick && (
            <Button onClick={onNewPolicyClick} className="flex items-center space-x-2 bg-white text-black hover:bg-white">
              <Plus className="w-4 h-4" />
              <span>New Policy</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-black hover:bg-black/10"
            onClick={() => window.location.assign("/notifications")}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-black hover:bg-black/10"
            onClick={() => setLocation("/settings")}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
