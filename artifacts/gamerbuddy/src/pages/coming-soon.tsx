import React from "react";
import { Link } from "wouter";
import { Clock, Rocket, Compass, Map, ChevronRight, Gamepad2 } from "lucide-react";

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
    `${feature} is part of our upcoming Phase ${phase} rollout. We're building it carefully to make sure it's reliable, safe, and fun.`;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full text-center space-y-8">

        {/* Glow orb */}
        <div className="relative flex items-center justify-center h-28 w-28 mx-auto">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 70%)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <div
            className="relative flex items-center justify-center h-20 w-20 rounded-2xl border-2"
            style={{
              background: "rgba(168,85,247,0.10)",
              borderColor: "rgba(168,85,247,0.35)",
              boxShadow: "0 0 32px rgba(168,85,247,0.20)",
            }}
          >
            <Clock className="h-9 w-9 text-primary" />
          </div>
        </div>

        {/* Badge */}
        <div className="flex items-center justify-center">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest"
            style={{
              background: "rgba(168,85,247,0.12)",
              borderColor: "rgba(168,85,247,0.35)",
              color: "#c084fc",
              boxShadow: "0 0 16px rgba(168,85,247,0.12)",
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "#a855f7", boxShadow: "0 0 6px rgba(168,85,247,0.7)" }}
            />
            Phase {phase} · Coming Soon
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            {feature}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
            {defaultDesc}
          </p>
        </div>

        {/* Phase context */}
        <div
          className="rounded-2xl border p-5 text-left space-y-3"
          style={{
            background: "rgba(168,85,247,0.05)",
            borderColor: "rgba(168,85,247,0.18)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Gamepad2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Where we are now
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {[
              { label: "Phase 1", desc: "Core Hiring",    status: "live",   dot: "#22c55e" },
              { label: `Phase ${phase}`, desc: feature,   status: "soon",   dot: "#a855f7" },
            ].map(({ label, desc, status, dot }) => (
              <div
                key={label}
                className="flex items-start gap-2 p-3 rounded-xl border"
                style={{
                  borderColor: status === "live" ? "rgba(34,197,94,0.22)" : "rgba(168,85,247,0.22)",
                  background: status === "live" ? "rgba(34,197,94,0.06)" : "rgba(168,85,247,0.06)",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0 mt-0.5"
                  style={{ background: dot, boxShadow: `0 0 5px ${dot}` }}
                />
                <div>
                  <div
                    className="font-bold text-[11px] uppercase tracking-wider"
                    style={{ color: dot }}
                  >
                    {label}
                  </div>
                  <div className="text-muted-foreground/70 mt-0.5 text-[11px] leading-snug">
                    {status === "live" ? "✅ Live now" : "🔜 Coming soon"}
                    <span className="block text-muted-foreground/50">{desc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/browse">
            <button
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #9333ea, #7c3aed)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(147,51,234,0.35)",
              }}
            >
              <Compass className="h-4 w-4" />
              Browse Requests
            </button>
          </Link>
          <Link href="/roadmap">
            <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border font-bold text-sm transition-all hover:border-primary/50 hover:text-primary text-muted-foreground"
              style={{ borderColor: "rgba(255,255,255,0.10)" }}
            >
              <Map className="h-4 w-4" />
              View Roadmap
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground/40">
          We're rolling out features gradually to keep things smooth and secure. Thank you for your patience!
        </p>
      </div>
    </div>
  );
}
