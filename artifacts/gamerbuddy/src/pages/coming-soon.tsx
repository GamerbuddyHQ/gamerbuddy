import React from "react";
import { Link } from "wouter";
import { Rocket, Map, ChevronRight, Sparkles } from "lucide-react";

interface Props {
  feature?: string;
  phase?: number;
  description?: string;
}

export default function ComingSoon({
  feature = "This Feature",
  phase = 2,
  description,
}: Props) {
  const defaultDesc =
    description ??
    `${feature} is arriving in Phase ${phase}. We're building it carefully — reliable, safe, and worth the wait.`;

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center space-y-10">

        {/* Icon + ambient glow */}
        <div className="relative flex items-center justify-center mx-auto h-24 w-24">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(79,158,255,0.18) 0%, transparent 72%)",
              filter: "blur(12px)",
              transform: "scale(1.6)",
            }}
          />
          <div
            className="relative flex items-center justify-center h-20 w-20 rounded-[22px]"
            style={{
              background: "linear-gradient(135deg, rgba(79,158,255,0.14) 0%, rgba(79,158,255,0.08) 100%)",
              border: "1px solid rgba(79,158,255,0.22)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Sparkles className="h-8 w-8" style={{ color: "rgba(79,158,255,0.75)" }} />
          </div>
        </div>

        {/* Phase pill */}
        <div className="flex items-center justify-center">
          <span
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase"
            style={{
              background: "rgba(79,158,255,0.10)",
              color: "rgba(79,158,255,0.85)",
              letterSpacing: "0.12em",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{
                background: "#4F9EFF",
                boxShadow: "0 0 5px rgba(79,158,255,0.8)",
              }}
            />
            Phase {phase} · Coming Soon
          </span>
        </div>

        {/* Heading + description */}
        <div className="space-y-4">
          <h1
            className="text-3xl sm:text-[2.5rem] font-black tracking-tight leading-none text-foreground"
            style={{ letterSpacing: "-0.03em" }}
          >
            {feature}
          </h1>
          <p className="text-muted-foreground/75 text-[15px] leading-[1.75] max-w-sm mx-auto">
            {defaultDesc}
          </p>
        </div>

        {/* Slim phase status strip */}
        <div className="flex items-stretch rounded-2xl overflow-hidden border border-border/50">
          <div
            className="flex-1 flex items-center gap-2.5 px-4 py-3.5 border-r border-border/40"
            style={{ background: "rgba(34,197,94,0.07)" }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.7)", animation: "pulse 1.5s infinite" }}
            />
            <div className="text-left">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400/80">Phase 1</div>
              <div className="text-[11px] text-muted-foreground/55 mt-0.5">Core Hiring — Live</div>
            </div>
          </div>
          <div
            className="flex-1 flex items-center gap-2.5 px-4 py-3.5"
            style={{ background: "rgba(79,158,255,0.05)" }}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: "rgba(79,158,255,0.6)", boxShadow: "0 0 5px rgba(79,158,255,0.4)" }}
            />
            <div className="text-left">
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(79,158,255,0.70)" }}>Phase {phase}</div>
              <div className="text-[11px] text-muted-foreground/45 mt-0.5 truncate">{feature}</div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/browse">
            <button
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #2060c8, #2060c8)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(79,158,255,0.30)",
              }}
            >
              <Rocket className="h-4 w-4" />
              Browse Requests
            </button>
          </Link>
          <Link href="/roadmap">
            <button
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border font-semibold text-sm transition-all hover:border-primary/40 hover:text-foreground/80 text-muted-foreground/55"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <Map className="h-4 w-4" />
              Full Roadmap
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            </button>
          </Link>
        </div>

        <p className="text-[11px] text-muted-foreground/30 max-w-xs mx-auto leading-relaxed">
          Rolling out gradually — so every feature lands polished, secure, and ready to play.
        </p>
      </div>
    </div>
  );
}
