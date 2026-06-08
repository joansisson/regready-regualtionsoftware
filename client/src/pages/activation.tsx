import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@/assets/regready-logo.png";
import {
  getStoredActivationProfile,
  getStoredActivationStatus,
  getStoredGeminiKey,
  setStoredActivationProfile,
  setStoredActivationStatus,
  setStoredGeminiKey,
  setStoredLLMProvider,
  type LLMProvider,
} from "@/lib/auth";
import styles from "./activation.module.css";

type ActivationState = "idle" | "saving" | "error";
type ActivationMode = "page" | "form";

type ActivationProps = {
  mode?: ActivationMode;
};

const DEFAULT_PASSWORD = "RegReady123!";

const isValidGeminiKey = (value: string) => /^AIza[0-9A-Za-z_-]{20,}$/.test(value.trim());

export default function Activation({ mode = "page" }: ActivationProps) {
  const [, setLocation] = useLocation();

  const [isCinematicComplete, setIsCinematicComplete] = useState(() => mode !== "form");

  const fullNameInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState("Local Admin");
  const [email, setEmail] = useState("pro@regready");

  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [confirmPassword, setConfirmPassword] = useState(DEFAULT_PASSWORD);

  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(true);

  const [state, setState] = useState<ActivationState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // For embedded cinematic boot-up (Landing -> Activation), block submission until 10s + fade-in is visible.
    if (mode !== "form") return;

    setIsCinematicComplete(false);
    const t = window.setTimeout(() => setIsCinematicComplete(true), 12_000);
    return () => window.clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (mode !== "form") return;
    if (!isCinematicComplete) return;
    fullNameInputRef.current?.focus();
  }, [isCinematicComplete, mode]);

  useEffect(() => {
    const geminiKey = getStoredGeminiKey().trim();

    if (!getStoredActivationStatus()) return;
    if (!geminiKey.startsWith("AIza")) return;

    const profile = getStoredActivationProfile();
    if (profile?.fullName) setFullName(profile.fullName);
    if (profile?.email) setEmail(profile.email);
    setLocation("/login");
  }, [setLocation]);

  const provider = useMemo<LLMProvider>(() => "gemini", []);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 1 &&
      email.trim().includes("@") &&
      provider === "gemini" &&
      isValidGeminiKey(geminiKey) &&
      password.length >= 8 &&
      password === confirmPassword
    );
  }, [email, fullName, geminiKey, password, confirmPassword, provider]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setState("error");
      setMessage("Enter a valid Gemini API key (AIza...) and complete all required fields.");
      return;
    }

    setState("saving");
    setMessage("");

    setStoredActivationProfile({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    setStoredGeminiKey(geminiKey.trim());
    setStoredLLMProvider(provider);
    setStoredActivationStatus(true);

    setLocation("/login");
  };

  const form = (
    <form className={`${styles.form} w-full max-w-[340px]`} onSubmit={handleSubmit}>
      <Card
        className={[
          "border-orange-100 bg-white text-slate-900 shadow-xl shadow-orange-900/5",
          mode === "form" ? "activation-form-delay-in" : "",
          styles.card,
        ].join(" ")}
      >
        <CardHeader className="space-y-1 px-6 pt-6">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            Activation
          </CardTitle>
          <CardDescription className="text-xs font-medium text-slate-500">
            Unlock Your Desktop Mode: create your local admin profile and enter your Gemini API key (BYOK).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6 pb-8">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Full Admin Name
              </Label>
              <Input
                ref={fullNameInputRef}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 border-orange-100 bg-[#FCF7EF]/30 focus:ring-emerald-500"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Office Email
              </Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="h-10 border-orange-100 bg-[#FCF7EF]/30 focus:ring-emerald-500"
                placeholder="admin@office.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Gemini API Key
              </Label>
              <div className="relative">
                <Input
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  type={showGeminiKey ? "text" : "password"}
                  className="h-10 border-orange-100 bg-[#FCF7EF]/30 pr-10"
                  placeholder="AIza..."
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"
                  aria-label="Toggle Gemini API key visibility"
                >
                  {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="text-[10px] font-medium text-slate-400 pt-1">
              Enter a valid Gemini key (AIza...).
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Password</Label>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="h-10 border-orange-100 bg-[#FCF7EF]/30"
                  placeholder="Create password"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Verify</Label>
                <Input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  className="h-10 border-orange-100 bg-[#FCF7EF]/30"
                  placeholder="Repeat"
                />
              </div>
            </div>
          </div>

          <Alert className="border-emerald-100 bg-emerald-50/50 px-3 py-2">
            <AlertDescription className="flex items-center gap-2 text-[10px] font-medium leading-snug text-emerald-800">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              Protocol: Local-First Encryption Active.
            </AlertDescription>
          </Alert>

          {message && state === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </div>
          )}

          <Button
            type="submit"
            disabled={!isCinematicComplete || !canSubmit || state === "saving"}
            className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition-all hover:bg-emerald-800"
          >
            {state === "saving" ? "INITIALIZING..." : "INITIALIZE SYSTEM"}
          </Button>

          <div className="pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-xl border-orange-200 bg-white/80 hover:bg-white"
              onClick={() => {
                const keys = [
                  "regready_device_activated",
                  "regready_activation_profile",
                  "regready_gemini_api_key",
                  "regready_llm_provider",
                  "regready_user",
                  "regready_session_user",
                ];
                for (const k of keys) window.localStorage.removeItem(k);
                window.location.href = "/activation";
              }}
            >
              Reset local activation (brand new start)
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );

  if (mode === "form") {
    return (
      <div className={`${styles.pageRoot} h-full w-full bg-transparent text-slate-900 selection:bg-orange-100`}>
        <main className="flex h-full items-center justify-center p-4">{form}</main>
      </div>
    );
  }

  return (
    <div className={`${styles.pageRoot} min-h-screen bg-[#FCF7EF] text-slate-900 selection:bg-orange-100`}>
      <main className="grid min-h-screen lg:grid-cols-[1fr_400px]">
        <section className="grid min-h-screen grid-rows-2 border-r border-orange-100/50">
          <div className="flex items-center justify-center bg-white/40 p-8">
            <div className="flex w-full max-w-[360px] flex-col items-center justify-center rounded-3xl border border-orange-100 bg-white p-10 shadow-sm">
              <img src={logo} alt="RegReady" className="w-full max-w-[220px] select-none object-contain" />
              <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-tight text-emerald-700">
                <Building2 className="h-3 w-3" />
                Compliance Standard Active
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center bg-[#F5EFE6]/30 p-8">
            <div className="max-w-md text-center">
              <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 lg:text-6xl">
                Active Now
              </h1>
              <p className="mt-6 text-lg font-medium leading-relaxed text-slate-600">
                Create your local admin profile and link your API key to bring the engine online. Your compliance data is now encrypted and locked to this machine.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-6 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          {form}
        </section>
      </main>
    </div>
  );
}
