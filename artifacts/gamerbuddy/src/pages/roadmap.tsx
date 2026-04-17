import React from "react";
import { Link } from "wouter";
import {
  CheckCircle2, Clock, Rocket, Zap, Users, Trophy,
  Gamepad2, Wallet, Star, Shield, Globe, MessageSquare,
  Swords, Bot, Sparkles, Map, Lightbulb, ChevronRight,
  Lock, AlertTriangle, CircleDollarSign, Gift, BadgeDollarSign,
  Radio, Smartphone, Link2, Handshake,
} from "lucide-react";

const PHASES = [
  {
    id: 1,
    tag: "Now Live",
    title: "Core Hiring + Trust Features",
    status: "live" as const,
    accent: "#22c55e",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.22)",
    glow: "rgba(34,197,94,0.12)",
    bar: "from-green-500 to-emerald-400",
    Icon: Gamepad2,
    description:
      "The complete Phase 1 experience — core hiring, full PC and console account linking, identity verification, and safety protections. All live from day one.",
    items: [
      {
        icon: Zap,
        title: "Core Hiring System",
        desc: "Post requests, place bids, accept sessions, play together, and complete payments — with mandatory reviews on completion.",
      },
      {
        icon: Wallet,
        title: "Dual Wallets + Escrow",
        desc: "Hiring Wallet for posting sessions and an Earnings Wallet for receiving payouts. Funds held in escrow until both players approve.",
      },
      {
        icon: CircleDollarSign,
        title: "10% Platform Fee",
        desc: "A 10% fee is deducted from the session escrow on completion. The remaining 90% goes straight to the gamer's Earnings Wallet.",
      },
      {
        icon: Link2,
        title: "Full PC Account Linking",
        desc: "Connect your Steam and Epic Games accounts — show verified platform credentials on your profile and every bid card.",
      },
      {
        icon: Link2,
        title: "Full Console Account Linking",
        desc: "Link your PlayStation Network, Xbox, and Nintendo Switch accounts for verified console identity — visible on bids and your profile.",
      },
      {
        icon: Shield,
        title: "Account Verification",
        desc: "Users must link at least one gaming account to post requests or bid. Full identity review (7–15 days) unlocks the verified badge.",
      },
      {
        icon: Gift,
        title: "Gift Button",
        desc: "Send a tip or bonus to a gamer you loved playing with — right from the session page or their profile.",
      },
      {
        icon: Radio,
        title: "Streaming Channel Linking",
        desc: "Link your Twitch, YouTube Gaming, Kick, Facebook Gaming, or TikTok Live channels. They show on your profile and bid cards.",
      },
      {
        icon: Globe,
        title: "Superr.bio Social Hub",
        desc: "All community links, Discord, and social platforms are unified at one place — the 'Social' tab in navigation.",
      },
      {
        icon: AlertTriangle,
        title: "Safety Rules & Anti-Backdoor Protections",
        desc: "Never share account passwords. Escrow-only payments. Safety warnings, AI chat guidance, and anti-off-platform protections built in.",
      },
    ],
  },
  {
    id: 2,
    tag: "Coming Soon",
    title: "Tournaments & Bulk Hiring",
    status: "next" as const,
    accent: "#22d3ee",
    bg: "rgba(34,211,238,0.07)",
    border: "rgba(34,211,238,0.22)",
    glow: "rgba(34,211,238,0.12)",
    bar: "from-cyan-400 to-sky-400",
    Icon: Trophy,
    description:
      "Expand the platform with competitive tournaments, bulk group hiring, and mobile account linking. Shaped by what the community wants most.",
    items: [
      {
        icon: Swords,
        title: "Tournaments",
        desc: "Free to join, hirer approves every participant — competitive, fair, and open to all with country, region, and gender filters.",
      },
      {
        icon: Users,
        title: "Bulk Hiring",
        desc: "Hire between 3 and 100 gamers in a single request — perfect for group raids, events, and large team sessions.",
      },
      {
        icon: Smartphone,
        title: "Mobile Account Linking",
        desc: "Link your Google Play and iOS Game Center accounts for verified mobile gaming credentials.",
      },
      {
        icon: Sparkles,
        title: "Advanced Features",
        desc: "More platform features shaped directly by Community suggestions and votes — your ideas drive what gets built next.",
      },
    ],
  },
  {
    id: 3,
    tag: "Future",
    title: "Next-Level Platform",
    status: "future" as const,
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.20)",
    glow: "rgba(245,158,11,0.10)",
    bar: "from-amber-400 to-orange-400",
    Icon: Rocket,
    description:
      "The long-term vision — smarter AI, deeper mobile support, game developer partnerships, and a platform shaped entirely by the community.",
    items: [
      {
        icon: Smartphone,
        title: "Full Mobile Enhancements",
        desc: "Native mobile app improvements with push notifications, deeper platform integrations, and mobile-first UI.",
      },
      {
        icon: Handshake,
        title: "Game Dev Partnerships",
        desc: "Partner with game developers and publishers for sponsored sessions, exclusive content, and in-game rewards.",
      },
      {
        icon: Bot,
        title: "Advanced AI Support",
        desc: "Smarter AI replies, proactive suggestions, and deeper answers for every platform question.",
      },
      {
        icon: Lock,
        title: "Stronger Security Tools",
        desc: "Advanced fraud detection, enhanced account protection, and expanded admin moderation controls.",
      },
      {
        icon: Lightbulb,
        title: "Community-Driven Enhancements",
        desc: "More platform features shaped directly by your Community suggestions and votes.",
      },
    ],
  },
];

const STATUS_STYLES = {
  live:   { dot: "#22c55e", pulse: true,  label: "Now Live"    },
  next:   { dot: "#22d3ee", pulse: false, label: "Coming Soon" },
  future: { dot: "#f59e0b", pulse: false, label: "Future"      },
};

const STATUS_ICON = {
  live:   CheckCircle2,
  next:   Clock,
  future: Rocket,
};

export default function Roadmap() {
  return (
    <div className="max-w-3xl mx-auto space-y-14 pb-16">

      {/* ── Hero ── */}
      <div className="text-center space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/8 text-primary text-[11px] font-black uppercase tracking-widest">
          <Map className="h-3.5 w-3.5" />
          Product Roadmap
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground leading-tight">
          Our{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Roadmap
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
          We're building Gamerbuddy step by step to create the best co-op gaming experience.
        </p>

        {/* Quick status pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {PHASES.map((p) => {
            const s = STATUS_STYLES[p.status];
            return (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold"
                style={{ background: p.bg, borderColor: p.border, color: p.accent }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: s.dot, boxShadow: `0 0 5px ${s.dot}` }}
                />
                Phase {p.id}: {s.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Phase 1 Live Banner ── */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(168,85,247,0.04) 100%)",
          borderColor: "rgba(34,197,94,0.18)",
          boxShadow: "0 0 40px rgba(34,197,94,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: "#22c55e", boxShadow: "0 0 7px rgba(34,197,94,0.7)", animation: "pulse 1.5s infinite" }}
          />
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-green-400/90">
            Phase 1 is live now
          </span>
        </div>
        <p className="text-sm sm:text-[15px] text-foreground/80 leading-[1.75]">
          <strong className="text-foreground">Phase 1 — Core Hiring + Trust Features — is fully live.</strong> The platform is open: core hiring, dual wallets, escrow, 10% fee, reviews, full PC account linking (Steam &amp; Epic), full console account linking (PlayStation, Xbox &amp; Switch), identity verification, streaming channels, safety protections, and a simplified social hub.
        </p>
        <p className="text-sm text-muted-foreground/60 leading-[1.75]">
          We're now building Phase 2 — tournaments with country/region/gender filters, bulk hiring (3–100 gamers), and mobile account linking. Your Community votes directly shape what gets prioritised next. 🚀
        </p>
      </div>

      {/* ── Phases ── */}
      <div className="space-y-8">
        {PHASES.map((phase) => {
          const StatusIcon = STATUS_ICON[phase.status];
          const statusStyle = STATUS_STYLES[phase.status];

          return (
            <div
              key={phase.id}
              className="rounded-2xl border overflow-hidden"
              style={{
                borderColor: phase.border,
                background: `linear-gradient(135deg, ${phase.bg} 0%, transparent 70%)`,
                boxShadow: `0 4px 40px ${phase.glow}`,
              }}
            >
              {/* Accent bar */}
              <div className={`h-[3px] w-full bg-gradient-to-r ${phase.bar}`} />

              <div className="p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className="text-[11px] font-black uppercase tracking-widest"
                        style={{ color: phase.accent }}
                      >
                        Phase {phase.id}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                        style={{ background: phase.bg, borderColor: phase.border, color: phase.accent }}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {statusStyle.label}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                      {phase.title}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                      {phase.description}
                    </p>
                  </div>

                  <div
                    className="shrink-0 hidden sm:flex items-center justify-center h-14 w-14 rounded-2xl border text-2xl font-black"
                    style={{ background: phase.bg, borderColor: phase.border, color: phase.accent }}
                  >
                    {phase.id}
                  </div>
                </div>

                {/* Feature items */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {phase.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="flex gap-3.5 p-4 rounded-xl border transition-colors"
                        style={{
                          borderColor: "rgba(255,255,255,0.06)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div
                          className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center border"
                          style={{ background: phase.bg, borderColor: phase.border }}
                        >
                          <ItemIcon className="h-4 w-4" style={{ color: phase.accent }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground leading-snug">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Suggest a Feature CTA ── */}
      <div
        className="rounded-2xl border p-8 text-center space-y-4"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(34,211,238,0.06) 100%)",
          borderColor: "rgba(168,85,247,0.28)",
          boxShadow: "0 0 40px rgba(168,85,247,0.10)",
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <span className="text-sm font-black uppercase tracking-widest text-primary">
            Shape the Future
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-foreground">
          Got an idea for Gamerbuddy?
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Every great feature started as a suggestion. Share yours and the community votes on what gets built next.
        </p>

        <Link href="/community">
          <button
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #a855f7, #7c3aed)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(168,85,247,0.35)",
            }}
          >
            <Lightbulb className="h-4 w-4" />
            Suggest a Feature
            <ChevronRight className="h-4 w-4" />
          </button>
        </Link>
      </div>

      {/* ── Need Help section ── */}
      <div
        className="rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
        style={{
          background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(168,85,247,0.04) 100%)",
          borderColor: "rgba(34,211,238,0.22)",
          boxShadow: "0 0 30px rgba(34,211,238,0.06)",
        }}
      >
        <div className="shrink-0 h-14 w-14 rounded-2xl border flex items-center justify-center"
          style={{ background: "rgba(34,211,238,0.10)", borderColor: "rgba(34,211,238,0.28)" }}>
          <MessageSquare className="h-7 w-7" style={{ color: "#22d3ee" }} />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#a855f7" }}>
            Need Help or Have Questions?
          </p>
          <h3 className="text-lg sm:text-xl font-black text-foreground">
            Find us on every platform
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questions about the roadmap, a feature, or anything else? Hit the <strong className="text-foreground/80">Social</strong> tab in the navigation — Discord, community, and all links in one place.
          </p>
        </div>
        <a
          href="https://www.superr.bio/gamerbuddy"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 60%, #22d3ee 100%)",
            boxShadow: "0 4px 24px rgba(168,85,247,0.30)",
          }}
        >
          <Globe className="h-4 w-4 shrink-0" />
          Our Social Hub
        </a>
      </div>

      {/* ── Early dev note ── */}
      <div
        className="rounded-xl border px-6 py-5 text-center"
        style={{
          borderColor: "rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          Phase 1 is complete and live. Phase 2 features are in active development.
          <br className="hidden sm:block" />
          Timelines are estimates and subject to change based on community feedback.
        </p>
        <p className="text-[11px] text-muted-foreground/40 mt-2">
          Last updated: April 2026
        </p>
      </div>
    </div>
  );
}
