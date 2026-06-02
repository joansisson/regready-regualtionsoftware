import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Settings2 } from "lucide-react";

type NotificationsPrefs = {
  inApp: boolean;
  email: boolean;
  mentions: boolean;
  weeklyDigest: boolean;
  sound: boolean;
};

const STORAGE_KEY = "regready_notification_prefs_v1";

function loadPrefs(): NotificationsPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        inApp: true,
        email: false,
        mentions: true,
        weeklyDigest: true,
        sound: false,
      };
    }

    const parsed = JSON.parse(raw) as Partial<NotificationsPrefs>;
    return {
      inApp: parsed.inApp ?? true,
      email: parsed.email ?? false,
      mentions: parsed.mentions ?? true,
      weeklyDigest: parsed.weeklyDigest ?? true,
      sound: parsed.sound ?? false,
    };
  } catch {
    return {
      inApp: true,
      email: false,
      mentions: true,
      weeklyDigest: true,
      sound: false,
    };
  }
}

function savePrefs(prefs: NotificationsPrefs) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationsPrefs>(() => loadPrefs());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const canSave = useMemo(() => Boolean(prefs), [prefs]);

  const setField = (key: keyof NotificationsPrefs, value: boolean) => {
    setPrefs((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!canSave) return;

    setIsSaving(true);
    try {
      savePrefs(prefs);
      toast({
        title: "Notification settings saved",
        description: "Your preferences will be used for future alerts.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Header
        title="Notifications"
        description="Control in-app alerts and email notifications for your compliance workspace."
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Delivery
              </CardTitle>
              <CardDescription>Choose how you want to receive alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="inApp">In-app notifications</Label>
                  <p className="text-sm text-neutral-500">Show alerts inside the RegReady UI.</p>
                </div>
                <Switch id="inApp" checked={prefs.inApp} onCheckedChange={(v) => setField("inApp", v)} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Email notifications</Label>
                  <p className="text-sm text-neutral-500">Send important alerts to your email.</p>
                </div>
                <Switch
                  id="email"
                  checked={prefs.email}
                  onCheckedChange={(v) => setField("email", v)}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="sound">Play sound</Label>
                  <p className="text-sm text-neutral-500">Optional. Helpful for quick awareness.</p>
                </div>
                <Switch id="sound" checked={prefs.sound} onCheckedChange={(v) => setField("sound", v)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {prefs.email ? "Email ON" : "Email OFF"}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Settings2 className="h-3 w-3" />
                  {prefs.weeklyDigest ? "Weekly digest ON" : "Weekly digest OFF"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What alerts should you get?</CardTitle>
              <CardDescription>Fine-tune the type of notifications you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="mentions">Mentions (@you)</Label>
                  <p className="text-sm text-neutral-500">Notify you when someone mentions you in discussions.</p>
                </div>
                <Switch
                  id="mentions"
                  checked={prefs.mentions}
                  onCheckedChange={(v) => setField("mentions", v)}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="weeklyDigest">Weekly digest</Label>
                  <p className="text-sm text-neutral-500">A summary of activity and tasks each week.</p>
                </div>
                <Switch
                  id="weeklyDigest"
                  checked={prefs.weeklyDigest}
                  onCheckedChange={(v) => setField("weeklyDigest", v)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPrefs(loadPrefs())} disabled={isSaving}>
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
