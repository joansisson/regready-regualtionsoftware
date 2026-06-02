import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, ShieldCheck, Sparkles, Lock } from "lucide-react";
import logo from "@assets/regready-logo.png";
import {
  getStoredActivationProfile,
  getStoredActivationStatus,
  setSessionUser,
  type LocalUser,
} from "@/lib/auth";

type LoginState = "idle" | "submitting" | "error";

 // IMPORTANT: This pulls the email from what they typed during activation
const DEFAULT_EMAIL = "pro@regready.local";
const DEFAULT_PASSWORD = "RegReady123!";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [state, setState] = useState<LoginState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // If they aren't activated, kick them back to setup
    if (!getStoredActivationStatus()) {
      setLocation("/activation");
      return;
    }

    const profile = getStoredActivationProfile();
    if (profile?.email) {
      setEmail(profile.email);
    }
  }, [setLocation]);

  const canSubmit = useMemo(() => {
    return email.trim().includes("@") && password.length > 0;
  }, [email, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    try {
      const profile = getStoredActivationProfile();

      // We still use activation profile presence as a UX gate,
      // but the backend is the source of truth for credential validity now.
      if (!profile) {
        setState("error");
        setMessage("Activation is required before signing in.");
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          username: profile.fullName || "Admin",
        }),
      });

      if (!res.ok) {
        setState("error");
        setMessage("Invalid credentials. Please activate again and try signing in.");
        return;
      }

      const body = (await res.json()) as {
        token: string;
        user: LocalUser;
      };

      // This is what queryClient uses to attach Authorization: Bearer <token>
      window.localStorage.setItem("auth_token", body.token);

      // Preserve existing app logic that checks getSessionUser() / isAdmin()
      setSessionUser({
        ...body.user,
        email: body.user.email ?? email,
        username: body.user.username ?? profile.fullName ?? "Admin",
      });

      setLocation("/dashboard");
    } catch (err) {
      setState("error");
      setMessage("Sign-in failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FCF7EF] text-slate-900 selection:bg-orange-100">
      <div className="flex min-h-screen flex-col px-6 py-8 md:px-10">
        
        {/* Header - Clean Office Style */}
        <div className="mb-8 flex items-center justify-between">
          <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
            <img src={logo} alt="RegReady" className="h-12 w-auto select-none" />
          </div>
          <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-1 font-bold uppercase tracking-widest text-[10px]">
            <Lock className="mr-2 h-3 w-3" />
            Secure Access
          </Badge>
        </div>

        <main className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-500">
            
            <Card className="border-orange-100 bg-white text-slate-900 shadow-xl shadow-orange-900/5">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-slate-900">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                  Sign In
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  Daily Use: your password unlocks the local workspace so others on this computer can’t view compliance gaps.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Office Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      className="h-12 border-orange-100 bg-[#FCF7EF]/30 text-slate-900 focus:ring-emerald-500" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="h-12 border-orange-100 bg-[#FCF7EF]/30 text-slate-900 focus:ring-emerald-500" 
                    />
                  </div>

                  <Alert className="border-emerald-100 bg-emerald-50/50 py-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <AlertTitle className="text-emerald-900 font-bold text-xs uppercase tracking-tight">Authenticated Node</AlertTitle>
                    <AlertDescription className="text-[10px] text-emerald-700 font-medium">
                      Local-first encryption is active for this session.
                    </AlertDescription>
                  </Alert>

                  {message && state === "error" && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                      {message}
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={!canSubmit || state === "submitting"} 
                    className="h-14 w-full rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/10 hover:bg-emerald-800 text-lg font-bold transition-all"
                  >
                    {state === "submitting" ? "Verifying..." : "Access Dashboard"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              Hardware ID Linked • Private Instance
            </p>
          </div>
        </main>

        <footer className="mt-8 border-t border-orange-100 pt-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © 2024 RegReady • Imaginable Technologies
        </footer>
      </div>
    </div>
  );
}
