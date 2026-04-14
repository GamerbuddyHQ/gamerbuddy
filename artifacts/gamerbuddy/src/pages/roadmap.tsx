import React from "react";
import {
  CheckCircle2, Circle, Clock, Rocket, Zap, Users, Trophy,
  Gamepad2, Wallet, Star, Shield, Globe, MessageSquare,
  Swords, Gift, Bot, Tv2, Filter, Map, Sparkles, Lock,
  BarChart3, Smartphone, Crown, BookOpen, Cpu,
} from "lucide-react";

/* ── Phase config ── */
const PHASES = [
  {
    id: 1,
    label: "Phase 1",
    title: "Core Platform",
    status: "live" as const,
    statusLabel: "LIVE",
    accent: "#22c55e",
    accentBg: "rgba(34,197,94,0.08)",
    accentBorder: "rgba(34,197,94,0.25)",
    glowColor: "rgba(34,197,94,0.15)",
    Icon: Gamepad2,
    description: "The foundation — everything you need to hire, play, and get paid.",
    features: [
      { icon: Lock,           label: "Email/password auth with account lockout protection" },
      { icon: Wallet,         label: "Two-wallet system — Hiring Wallet & Earnings Wallet" },
      { icon: Map,            label: "Game request posting & smart browsing" },
      { icon: Zap,            label: "Bidding system with escrow protection" },
      { icon: MessageSquare,  label: "Real-time in-session chat" },
      { icon: CheckCircle2,   label: "Session approval & completion flow" },
      { icon: Star,           label: "Reviews & ratings" },
      { icon: Globe,          label: "In-app notifications" },
      { icon: Shield,         label: "Report user system" },
      { icon: Gift,           label: "Gift & tip system" },
      { icon: BarChart3,      label: "Browse/bid page with filters" },
    ],
  },
  {
    id: 2,
    label: "Phase 2",
    title: "Advanced Features",
    status: "soon" as const,
    statusLabel: "COMING SOON",
    accent: "#a855f7",
    accentBg: "rgba(168,85,247,0.08)",
    accentBorder: "rgba(168,85,247,0.25)",
    glowColor: "rgba(168,85,247,0.15)",
    Icon: Sparkles,
    description: "Power-user tools, verified profiles, and seamless payments.",
    features: [
      { icon: Crown,          label: "Steam-style profile with Points Shop" },
      { icon: Shield,         label: "Verified badge system" },
      { icon: BarChart3,      label: "Trust Factor score system" },
      { icon: Users,          label: "Bulk Hiring — hire multiple gamers at once" },
      { icon: Filter,         label: "Advanced bid filtering & sorting" },
      { icon: Globe,          label: "Nation/Country + Gender preferences" },
      { icon: Wallet,         label: "Razorpay & Stripe payment integration" },
      { icon: Bot,            label: "AI support chat assistant" },
      { icon: Cpu,            label: "Admin Security Dashboard" },
    ],
  },
  {
    id: 3,
    label: "Phase 3",
    title: "Community & Competition",
    status: "next" as const,
    statusLabel: "NEXT UP",
    accent: "#22d3ee",
    accentBg: "rgba(34,211,238,0.08)",
    accentBorder: "rgba(34,211,238,0.25)",
    glowColor: "rgba(34,211,238,0.15)",
    Icon: Trophy,
    description: "Compete, connect, and make Gamerbuddy your gaming home.",
    features: [
      { icon: Trophy,         label: "Tournament system with brackets & prizes" },
      { icon: BookOpen,       label: "Community Suggestions page" },
      { icon: Tv2,            label: "Streaming platform connections (Twitch, YouTube, Kick)" },
      { icon: Globe,          label: "Multi-language support — 10 languages" },
      { icon: Sparkles,       label: "Light/Dark theme toggle" },
      { icon: Clock,          label: "Regional Clock & timezone display" },
      { icon: Star,           label: "Socials & Follow Us page" },
      { icon: MessageSquare,  label: "Community GIF & reaction posts" },
    ],
  },
  {
    id: 4,
    label: "Phase 4",
    title: "Future Vision",
    status: "future" as const,
    statusLabel: "FUTURE",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.08)",
    accentBorder: "rgba(245,158,11,0.22)",
    glowColor: "rgba(245,158,11,0.12)",
    Icon: Rocket,
    description: "The next era of competitive gaming — bigger, bolder, unstoppable.",
    features: [
      { icon: Smartphone,     label: "Mobile app for iOS & Android" },
      { icon: BarChart3,      label: "Seasonal ranked leaderboards" },
      { icon: Swords,         label: "Gamer guilds & team management" },
      { icon: Trophy,         label: "eSports league integration" },
      { icon: Sparkles,       label: "Creator & influencer partnership program" },
      { icon: Cpu,            label: "Public developer API" },
    ],
  },
];

const STATUS_CONFIG = {
  live:   { dot: "#22c55e", pulse: true,  ring: "rgba(34,197,94,0.4)"   },
  soon:   { dot: "#a855f7", pulse: false, ring: "rgba(168,85,247,0.4)"  },
  next:   { dot: "#22d3ee", pulse: false, ring: "rgba(34,211,238,0.4)"  },
  future: { dot: "#f59e0b", pulse: false, ring: "rgba(245,158,11,0.35)" },
};

const FEATURE_STATUS = {
  live:   { Icon: CheckCircle2, color: "#22c55e" },
  soon:   { Icon: Clock,        color: "#a855f7" },
  next:   { Icon: Circle,       color: "#22d3ee" },
  future: { Icon: Circle,       color: "#f59e0b" },
};

export default function Roadmap() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16">

      {/* ── Hero ── */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-primary text-xs font-black uppercase tracking-widest mb-2">
          <Map className="h-3.5 w-3.5" />
          Product Roadmap
        </div>

        <h1
          className="text-4xl sm:text-5xl font-black tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          Our{" "}
          <span
            className="px-1"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
              borderRadius: "6px",
              padding: "2px 10px",
              display: "inline-block",
              color: "#fff",
            }}
          >
            Roadmap
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          From MVP to a full gaming ecosystem — here's where we're headed and what's coming next for Gamerbuddy.
        </p>

        {/* Phase summary pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {PHASES.map((p) => {
            const cfg = STATUS_CONFIG[p.status];
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold"
                style={{ background: p.accentBg, borderColor: p.accentBorder, color: p.accent }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: cfg.dot,
                    boxShadow: `0 0 6px ${cfg.ring}`,
                    animation: cfg.pulse ? "pulse 1.5s infinite" : undefined,
                  }}
                />
                {p.label}: {p.statusLabel}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        {/* Vertical spine */}
        <div
          className="absolute left-[23px] sm:left-[31px] top-0 bottom-0 w-[2px] pointer-events-none hidden sm:block"
          style={{ background: "linear-gradient(to bottom, rgba(168,85,247,0.5), rgba(34,211,238,0.3), transparent)" }}
        />

        <div className="space-y-10">
          {PHASES.map((phase, idx) => {
            const statusCfg = STATUS_CONFIG[phase.status];
            const featCfg   = FEATURE_STATUS[phase.status];

            return (
              <div key={phase.id} className="relative sm:pl-16">
                {/* Timeline node */}
                <div
                  className="absolute left-0 top-6 hidden sm:flex items-center justify-center h-[46px] w-[46px] sm:h-[62px] sm:w-[62px] rounded-2xl border-2"
                  style={{
                    background: phase.accentBg,
                    borderColor: phase.accentBorder,
                    boxShadow: `0 0 24px ${phase.glowColor}`,
                  }}
                >
                  <phase.Icon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: phase.accent }} />
                </div>

                {/* Card */}
                <div
                  className="rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${phase.accentBg} 0%, rgba(0,0,0,0) 60%)`,
                    borderColor: phase.accentBorder,
                    boxShadow: `0 4px 32px ${phase.glowColor}`,
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    className="h-[3px] w-full"
                    style={{ background: `linear-gradient(90deg, ${phase.accent}, transparent)` }}
                  />

                  <div className="p-5 sm:p-7">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Mobile icon */}
                          <div
                            className="sm:hidden flex items-center justify-center h-9 w-9 rounded-xl border"
                            style={{ background: phase.accentBg, borderColor: phase.accentBorder }}
                          >
                            <phase.Icon className="h-4.5 w-4.5" style={{ color: phase.accent }} />
                          </div>

                          <span
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: phase.accent }}
                          >
                            {phase.label}
                          </span>

                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                            style={{ background: phase.accentBg, borderColor: phase.accentBorder, color: phase.accent }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                background: statusCfg.dot,
                                boxShadow: `0 0 4px ${statusCfg.ring}`,
                                animation: statusCfg.pulse ? "pulse 1.5s infinite" : undefined,
                              }}
                            />
                            {phase.statusLabel}
                          </span>
                        </div>

                        <h2
                          className="text-xl sm:text-2xl font-black tracking-tight"
                          style={{ color: "var(--foreground)" }}
                        >
                          {phase.title}
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {phase.description}
                        </p>
                      </div>

                      {/* Phase number badge */}
                      <div
                        className="shrink-0 hidden sm:flex items-center justify-center h-12 w-12 rounded-xl text-2xl font-black"
                        style={{
                          background: phase.accentBg,
                          border: `1.5px solid ${phase.accentBorder}`,
                          color: phase.accent,
                          opacity: 0.9,
                        }}
                      >
                        {phase.id}
                      </div>
                    </div>

                    {/* Feature list */}
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {phase.features.map((feature) => {
                        const FeatureStatusIcon = featCfg.Icon;
                        const FeatureIcon = feature.icon;
                        return (
                          <div
                            key={feature.label}
                            className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl border transition-colors"
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              borderColor: "rgba(255,255,255,0.06)",
                            }}
                          >
                            <FeatureStatusIcon
                              className="h-4 w-4 shrink-0 mt-[1px]"
                              style={{ color: featCfg.color }}
                            />
                            <div className="flex items-center gap-2 min-w-0">
                              <FeatureIcon
                                className="h-3.5 w-3.5 shrink-0 opacity-50"
                                style={{ color: phase.accent }}
                              />
                              <span className="text-sm text-foreground/80 leading-snug">
                                {feature.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div
        className="rounded-2xl border p-5 flex flex-wrap items-center justify-center gap-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        {[
          { dot: "#22c55e", label: "Live — Available now"        },
          { dot: "#a855f7", label: "Coming Soon — In development" },
          { dot: "#22d3ee", label: "Next — Planned next quarter"  },
          { dot: "#f59e0b", label: "Future — On the horizon"      },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: dot, boxShadow: `0 0 6px ${dot}` }}
            />
            {label}
          </div>
        ))}
      </div>

      {/* ── Early dev note ── */}
      <div
        className="rounded-2xl border p-6 text-center space-y-2"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(34,211,238,0.04) 100%)",
          borderColor: "rgba(168,85,247,0.25)",
          boxShadow: "0 0 32px rgba(168,85,247,0.08)",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Rocket className="h-5 w-5 text-primary" />
          <span className="text-sm font-black uppercase tracking-widest text-primary">Early Development</span>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          We are in early development phase. Features will be rolled out gradually based on feedback.
          Your input directly shapes what we build next — head to{" "}
          <a href="/community" className="text-primary font-semibold hover:underline">
            Community Suggestions
          </a>{" "}
          to vote on upcoming features.
        </p>
        <p className="text-xs text-muted-foreground/50 pt-1">
          Last updated: April 2026 · Subject to change based on community feedback
        </p>
      </div>
    </div>
  );
}
