import React from "react";
import { Link } from "wouter";
import {
  CheckCircle2, Clock, Rocket, Zap, Users, Trophy,
  Gamepad2, Wallet, Star, Shield, Globe, MessageSquare,
  Swords, Bot, Sparkles, Map, Lightbulb, ChevronRight,
  Lock, AlertTriangle, CircleDollarSign, Gift, BadgeDollarSign,
} from "lucide-react";

/* ── Phase definitions — Phase 1 (live), Phase 2 (coming soon), Phase 3 (future) ── */
const PHASES = [
  {
    id: 1,
    tag: "Now Live",
    title: "Core Platform",
    status: "live" as const,
    accent: "#22c55e",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.22)",
    glow: "rgba(34,197,94,0.12)",
    bar: "from-green-500 to-emerald-400",
    Icon: Gamepad2,
    description:
      "The essential hiring experience — post, bid, play, pay, and review. Everything you need to hire gamers or earn as one.",
    items: [
      {
        icon: Zap,
        title: "Core Hiring System",
        desc: "Post requests, place bids, accept sessions, play together, and complete payments — with full reviews on completion.",
      },
      {
        icon: Wallet,
        title: "Dual Wallets",
        desc: "Hiring Wallet for posting sessions and an Earnings Wallet for receiving payouts — fully separated.",
      },
      {
        icon: CircleDollarSign,
        title: "10% Platform Fee",
        desc: "A 10% fee is deducted from the session escrow on completion. The rest goes straight to the gamer's Earnings Wallet.",
      },
      {
        icon: Gift,
        title: "Gift Button",
        desc: "Send a tip or bonus to a gamer you loved playing with — right from the session or their profile.",
      },
      {
        icon: BadgeDollarSign,
        title: "Wallet Limits",
        desc: "Minimum $10.75 required to post a request. Maximum $1,000 balance per wallet for safety.",
      },
      {
        icon: Shield,
        title: "Account Verification",
        desc: "Identity check for safety and trust — protects both hirers and gamers. Review takes 7–15 days.",
      },
      {
        icon: AlertTriangle,
        title: "Safety Rules & Warnings",
        desc: "Never share account passwords. Recording sessions is your own responsibility. Violations lead to bans.",
      },
    ],
  },
  {
    id: 2,
    tag: "Coming Soon",
    title: "Competition & Rewards",
    status: "next" as const,
    accent: "#22d3ee",
    bg: "rgba(34,211,238,0.07)",
    border: "rgba(34,211,238,0.22)",
    glow: "rgba(34,211,238,0.12)",
    bar: "from-cyan-400 to-sky-400",
    Icon: Trophy,
    description:
      "Scale your sessions, compete in tournaments, and unlock quests and rewards across your profile.",
    items: [
      {
        icon: Users,
        title: "Bulk Hiring",
        desc: "Hire between 2 and 100 gamers in a single request for group raids or team sessions.",
      },
      {
        icon: Swords,
        title: "Tournaments",
        desc: "Free to join, hirer approves every participant — competitive, fair, and open to all.",
      },
      {
        icon: Star,
        title: "Quest System",
        desc: "Challenges on user profiles — complete quests to earn bonus points and profile badges.",
      },
      {
        icon: Sparkles,
        title: "Promoted Games",
        desc: "Select games get spotlighted with bonus rewards for sessions played in them.",
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
      "The long-term vision — smarter AI, richer social features, and a more secure and expansive Gamerbuddy.",
    items: [
      {
        icon: Bot,
        title: "Advanced AI Support",
        desc: "Quick replies, smart suggestions, and deeper answers for every platform question.",
      },
      {
        icon: Globe,
        title: "Full Social Features",
        desc: "Streaming integrations, follower system, and more ways to connect with your gaming community.",
      },
      {
        icon: Lock,
        title: "Stronger Security Tools",
        desc: "More admin controls, fraud detection improvements, and enhanced account protection.",
      },
      {
        icon: Lightbulb,
        title: "Community-Driven Enhancements",
        desc: "More platform features shaped directly by your suggestions and community votes.",
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
          <strong className="text-foreground">Phase 1 is fully live</strong> — the core hiring platform is open, including wallets, escrow payments, a 10% platform fee, the gift button, wallet limits, account verification, and safety rules.
        </p>
        <p className="text-sm text-muted-foreground/60 leading-[1.75]">
          We're now building Phase 2 — tournaments, quests, and bulk hiring. Your Community votes directly shape what we prioritise next. 🚀
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
                    {/* Phase tag + status badge */}
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

                  {/* Phase number */}
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
