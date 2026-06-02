import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Zap, Lock } from "lucide-react";
import logo from "@assets/regready-logo.png";
import Activation from "@/pages/activation";

export default function Landing() {
  const LANDING_FADE_FLAG_KEY = "regready_page_zero_to_landing_fade_in";
  const [shouldFadeInFromPageZero] = useState(() => {
    try {
      return Boolean(window.sessionStorage.getItem(LANDING_FADE_FLAG_KEY));
    } catch {
      return false;
    }
  });
  const [isVisible, setIsVisible] = useState(() => !shouldFadeInFromPageZero);
  const [showActivationPanel, setShowActivationPanel] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);

  const READING_PAUSE_MS = 10_000;

  useEffect(() => {
    if (!shouldFadeInFromPageZero) return;

    try {
      window.sessionStorage.removeItem(LANDING_FADE_FLAG_KEY);
    } catch {
      // ignore
    }

    const raf = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, [shouldFadeInFromPageZero]);

  useEffect(() => {
    if (!isVisible) return;

    let rafId = 0;
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(100, (elapsed / READING_PAUSE_MS) * 100);
      setReadingProgress(progress);

      if (elapsed >= READING_PAUSE_MS) {
        setShowActivationPanel(true);
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isVisible]);

  return (
    <div
      className={[
        "relative min-h-screen overflow-x-hidden bg-[#FCF7EF] font-sans text-slate-900 selection:bg-orange-100",
        "transition-opacity duration-520",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div
        className="flex h-full w-[200%] transition-transform"
        style={{
          transform: showActivationPanel ? "translateX(-50%)" : "translateX(0%)",
          transitionDuration: showActivationPanel ? "1200ms" : "1200ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Landing */}
        <div className={["w-1/2 flex-shrink-0", showActivationPanel ? "fade-out-landing" : ""].join(" ")}>
          <div className="h-2 w-full bg-emerald-700" />

          <main className="flex min-h-0 items-start justify-center px-4 py-4 sm:px-6 lg:items-center lg:py-6">
            <div className="flex w-full max-w-6xl flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              <div className="flex w-full max-w-6xl flex-col items-center gap-6 text-center lg:items-start lg:text-left">
                <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm transition-transform duration-300 hover:scale-[1.01] sm:p-5">
                  <img
                    src={logo}
                    alt="RegReady Logo"
                    className="w-full max-w-[260px] select-none object-contain sm:max-w-[320px]"
                    draggable={false}
                  />
                </div>

                <div className="grid w-full gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
                  <section className="space-y-4">
                    <div className="space-y-4">
                      <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight text-slate-900 sm:text-5xl md:text-7xl">
                        Initialize Your <br />
                        <span className="font-serif italic text-emerald-700">Secure Workspace</span>
                      </h1>

                      <div className="relative">
                        <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg md:text-xl">
                          Establish your local credentials and link your API key to bring the remediation engine online.{" "}
                          RegReady transforms framework requirements into audit-ready policies—keeping your data 100% encrypted and isolated to this machine.
                        </p>

                        {/* Thin progress bar (fills over the 10s reading pause) */}
                        <div className="mt-2 h-[2px] w-full bg-slate-200/60">
                          <div
                            className="h-full bg-[#0B4FDE]/90"
                            style={{ width: `${readingProgress}%`, transition: "width 80ms linear" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fade value cards in after the 10s reading pause */}
                    <div
                      className={[
                        "grid gap-4 sm:grid-cols-3 transition-opacity duration-1200 ease-out",
                        showActivationPanel ? "opacity-100" : "opacity-0 pointer-events-none",
                      ].join(" ")}
                    >
                      {[
                        { title: "Local-First", desc: "Encrypted Storage", icon: <Lock className="h-4 w-4" /> },
                        { title: "Precision", desc: "Audit-Ready Artifacts.", icon: <Zap className="h-4 w-4" /> },
                        { title: "Secure", desc: "Private Workspace", icon: <ShieldCheck className="h-4 w-4" /> },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="group rounded-2xl border border-orange-100 bg-[#F5EFE6]/50 p-5 transition-colors hover:bg-white hover:shadow-md"
                        >
                          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-800">
                            {item.icon}
                            {item.title}
                          </div>
                          <div className="text-sm font-semibold text-slate-500 transition-colors group-hover:text-slate-900">
                            {item.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div
                    className={[
                      "flex flex-col items-center justify-center pt-2 lg:items-end lg:justify-start lg:pt-4",
                      "transition-opacity duration-1200 ease-out",
                      showActivationPanel ? "opacity-100" : "opacity-0 pointer-events-none",
                    ].join(" ")}
                  >
                    <div className="w-full max-w-[320px] flex flex-col gap-3 mt-4 sm:flex-row sm:items-center sm:justify-between">
                      <Button
                        asChild
                        variant="outline"
                        className="h-14 rounded-2xl w-full sm:w-auto"
                        onClick={() => {
                          window.location.href = "/download/installer";
                        }}
                      >
                        Download Installer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Activation panel (revealed after 10s pause) */}
        <div className="w-1/2 flex-shrink-0">
          <Activation mode="form" />
        </div>
      </div>
    </div>
  );
}
