import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import landingLogo from "@assets/regready-logo.png";
import Landing from "@/pages/landing";
import { Button } from "@/components/ui/button";

const PAGE_ZERO_SEEN_KEY = "regready_page_zero_seen";
const LANDING_FADE_FLAG_KEY = "regready_page_zero_to_landing_fade_in";
const FADE_MS = 520;

export default function PageZero() {
  const [, setLocation] = useLocation();
  const [isFadingOut, setIsFadingOut] = useState(false);

  const hasSeen = useMemo(() => {
    try {
      return Boolean(window.sessionStorage.getItem(PAGE_ZERO_SEEN_KEY));
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (hasSeen) return;
    // If user refreshes mid-transition, keep a consistent experience.
    try {
      if (!window.sessionStorage.getItem(LANDING_FADE_FLAG_KEY)) return;
      window.sessionStorage.removeItem(LANDING_FADE_FLAG_KEY);
    } catch {
      // ignore
    }
  }, [hasSeen]);

  const handleGetStarted = () => {
    if (isFadingOut) return;

    try {
      window.sessionStorage.setItem(PAGE_ZERO_SEEN_KEY, "1");
      window.sessionStorage.setItem(LANDING_FADE_FLAG_KEY, "1");
    } catch {
      // ignore storage issues; transition still runs
    }

    setIsFadingOut(true);
    window.setTimeout(() => {
      setLocation("/landing");
    }, FADE_MS);
  };

  if (hasSeen) return <Landing />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0E0E0E] text-white">
      <style>{`
        @keyframes regreadyShimmer {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          10% { opacity: 1; }
          60% { opacity: 0.95; }
          100% { transform: translateX(120%) skewX(-18deg); opacity: 0; }
        }
        @keyframes regreadyFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0px); }
        }
        @keyframes regreadyFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),rgba(0,0,0,0)_55%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 ring-1 ring-white/5" />

      <div
        className={[
          "relative flex min-h-screen flex-col items-center justify-center px-4 text-center",
          isFadingOut
            ? "animate-[regreadyFadeOut_520ms_ease-in_forwards]"
            : "animate-[regreadyFadeIn_520ms_ease-out_forwards]",
        ].join(" ")}
      >
        <img
          src={landingLogo}
          alt="RegReady Logo"
          draggable={false}
          className="select-none w-full max-w-[380px] sm:max-w-[440px] drop-shadow-[0_18px_35px_rgba(0,0,0,0.6)]"
        />

        <div className="mt-8">
          <p className="font-sans text-[18px] sm:text-[20px] font-semibold tracking-tight text-white/90">
            Compliance, Automated. Privacy, Absolute.
          </p>
        </div>

        <div className="mt-10">
          <Button
            onClick={handleGetStarted}
            disabled={isFadingOut}
            className={[
              "relative overflow-hidden rounded-2xl border border-white/15 bg-white/95 text-slate-950",
              "h-[56px] px-8 text-[16px] font-extrabold tracking-[0.02em]",
              "shadow-[0_20px_60px_rgba(0,0,0,0.45)] shadow-emerald-900/10",
              "hover:bg-white",
              "active:scale-[0.99] transition-transform duration-150",
              isFadingOut ? "cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">Get Started</span>
            <span
              aria-hidden="true"
              className="absolute inset-0 z-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0) 70%)",
              }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 z-10"
              style={{
                animation: isFadingOut ? "none" : "regreadyShimmer 1400ms ease-in-out infinite",
              }}
            />
          </Button>
        </div>

        <div className="mt-8 text-[11px] uppercase tracking-[0.26em] text-white/45">
          Secure Local Workspace • Zero Cloud
        </div>
      </div>

      {isFadingOut ? <div className="absolute inset-0 bg-[#0E0E0E]" aria-hidden="true" /> : null}
    </div>
  );
}
