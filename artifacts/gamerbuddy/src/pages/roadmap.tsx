import React from "react";
import { Link } from "wouter";
import {
  CheckCircle2, Clock, Rocket, Zap, Users, Trophy,
  Gamepad2, Wallet, Shield, Globe, MessageSquare,
  Swords, Bot, Map, Lightbulb, ChevronRight,
  Lock, AlertTriangle,
  Smartphone, Link2, Handshake,
  Star, Camera, SlidersHorizontal, FileText, Banknote, Hash,
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
      "Everything currently live on Player4Hire — from user accounts and profiles to payments, messaging, community, and full safety protections.",
    items: [
      {
        icon: Shield,
        title: "Account Creation + Gaming Account Linking",
        desc: "Sign up and link at least one gaming account (Steam, Epic, PSN, Xbox, or Nintendo Switch). Accounts are reviewed within 24–48 hours. After verification, a small one-time activation fee is required to fully unlock posting, bidding, and hiring — paid once, never again.",
      },
      {
        icon: Zap,
        title: "One-Time Account Activation Fee",
        desc: "To keep Player4Hire safe and enjoyable for real gamers, a small one-time fee is charged after verification — 🇮🇳 ₹149 for India, 🌍 $5 for Global. This protects against fake/bot accounts and spam, keeping the community high-quality and trustworthy. Paid once only — you'll never be charged again. ❤️",
      },
      {
        icon: Hash,
        title: "Unique User ID (GB-XXXXXX)",
        desc: "Every user gets a permanent GB-XXXXXX identifier shown on their profile, earnings card, and admin payout list — with a one-click copy button.",
      },
      {
        icon: Camera,
        title: "Profile Photos with Trust Verification",
        desc: "1 main profile picture + minimum 2 additional real solo photos (max 4 total). Anti-AI and fake photo warning enforced on upload. Duplicate image detection prevents re-use.",
      },
      {
        icon: Globe,
        title: "Regional Minimum Hiring Fee",
        desc: "₹200 per hour for India, $5 USD per hour for global. Enforced on every request — gamers can bid at or above the floor, never below.",
      },
      {
        icon: Gamepad2,
        title: "Request Posting, Bidding & Session Management",
        desc: "Post requests with game, platform, region, and objectives. Gamers bid competitively. Accept, start, complete, and review — the full session lifecycle managed in-app.",
      },
      {
        icon: MessageSquare,
        title: "Simple In-App Messaging",
        desc: "A private chat opens between hirer and gamer once a bid is accepted — used to exchange Discord usernames and voice chat details before the session begins.",
      },
      {
        icon: Wallet,
        title: "Dual Wallets with $100 Withdrawal Threshold",
        desc: "Hiring Wallet for funding sessions (escrow-held until completion) and Earnings Wallet for payouts. Minimum withdrawal threshold is $100 USD.",
      },
      {
        icon: Zap,
        title: "10% Platform Fee",
        desc: "A flat 10% platform fee is deducted from every successfully completed Quest or Job. Gamers keep 90% — transparently shown before every session.",
      },
      {
        icon: Banknote,
        title: "Manual Payout System",
        desc: "Gamers click 'Request Withdrawal' once the $100 USD threshold is met. Admin reviews and approves each request, marks it as Paid, and processes every Monday.",
      },
      {
        icon: Star,
        title: "Reviews, Trust Factor, Verified Badge & Gaming Accounts",
        desc: "Both parties leave mandatory reviews on completion. Trust Factor updates live. Verified badge shown on all profiles and bid cards. Steam, Epic, PSN, Xbox, and Switch accounts displayed publicly.",
      },
      {
        icon: SlidersHorizontal,
        title: "Optional Gender Preference Filter",
        desc: "Hirers can optionally filter by gender preference (Male, Female, Non-binary, or No preference) when posting a request — fully optional, never required.",
      },
      {
        icon: Users,
        title: "Community Tab",
        desc: "Post suggestions, like/dislike ideas, comment with GIFs and emojis. Moderated actively. Community votes directly shape what gets built next.",
      },
      {
        icon: Handshake,
        title: "Community Guidelines & Behavior Rules",
        desc: "Be polite, be respectful. No harassment, no nudes or explicit content, maintain professional communication, and respect privacy. Full rules on the About page and every profile.",
      },
      {
        icon: FileText,
        title: "Professional Disclaimer with Funds Holding Note",
        desc: "Clean 7-section disclaimer covering early development, performance guarantees, funds holding, session recording, community rules, verification, and the one-time activation fee — legally clear and user-readable.",
      },
    ],
  },
  {
    id: 2,
    tag: "Coming Soon",
    title: "Tournaments, Payouts & Real-Time",
    status: "next" as const,
    accent: "#8EC1DE",
    bg: "rgba(142,193,222,0.07)",
    border: "rgba(142,193,222,0.22)",
    glow: "rgba(142,193,222,0.12)",
    bar: "from-cyan-400 to-sky-400",
    Icon: Trophy,
    description:
      "Competitive tournaments, bulk group hiring, automatic payouts, and real-time platform features. Shaped by what the community votes for most.",
    items: [
      {
        icon: Swords,
        title: "Tournaments",
        desc: "Free to join, hirer approves every participant — competitive, fair, and open to all with country, region, and gender filters.",
      },
      {
        icon: Users,
        title: "Bulk Hiring",
        desc: "Hire between 3 and 100 gamers in a single request — perfect for group raids, large events, and team sessions.",
      },
      {
        icon: Banknote,
        title: "Automatic Payouts",
        desc: "Instant payout processing the moment the $100 threshold is hit — no manual request needed. Faster settlements for active gamers.",
      },
      {
        icon: Zap,
        title: "Advanced Real-Time Features",
        desc: "Live notifications, real-time bid updates, session status pings, and instant messaging improvements — making every interaction feel instant.",
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
      "The long-term vision — smarter AI, deeper mobile support, game developer partnerships, and stronger security.",
    items: [
      {
        icon: Bot,
        title: "Advanced AI Support",
        desc: "Smarter AI replies, proactive suggestions, and deeper answers for every platform question.",
      },
      {
        icon: Handshake,
        title: "Game Dev Partnerships",
        desc: "Partner with game developers and publishers for sponsored sessions, exclusive content, in-game rewards, and promoted games.",
      },
      {
        icon: Lock,
        title: "Stronger Security Tools",
        desc: "Advanced fraud detection, enhanced account protection, and expanded admin moderation controls.",
      },
      {
        icon: Smartphone,
        title: "Full Mobile Enhancements",
        desc: "Native mobile app improvements with push notifications, deeper platform integrations, and mobile-first UI.",
      },
    ],
  },
];

const STATUS_STYLES = {
  live:   { dot: "#22c55e", pulse: true,  label: "Now Live"    },
  next:   { dot: "#8EC1DE", pulse: false, label: "Coming Soon" },
  future: { dot: "#f59e0b", pulse: false, label: "Future"      },
};

const STATUS_ICON = {
  live:   CheckCircle2,
  next:   Clock,
  future: Rocket,
};

export default function Roadmap() {
  return (
    <div className="max-w-4xl mx-auto space-y-14 pb-16">

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
              background: "linear-gradient(135deg, #ACB5FF 0%, #8EC1DE 100%)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Roadmap
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
          We're building Player4Hire step by step to create the best co-op gaming experience.
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
          background: "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(172,181,255,0.04) 100%)",
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
          <strong className="text-foreground">Phase 1 is fully live.</strong> User registration with 24–48hr verification, one-time account activation fee (🇮🇳 ₹149 India · 🌍 $5 Global — once only), unique GB-XXXXXX IDs, profile photos with anti-AI enforcement, regional minimum fees (₹200/hr India · $5/hr global), request posting &amp; bidding, in-app messaging, dual wallets with 10% platform fee, manual payouts ($100 threshold), reviews &amp; Trust Factor, connected gaming accounts display, optional gender filter, Community tab with voting, full Community Guidelines, and a professional 7-section Disclaimer.
        </p>
        <p className="text-sm text-muted-foreground/60 leading-[1.75]">
          We're now building Phase 2 — tournaments, bulk hiring (3–100 gamers), automatic payouts, and advanced real-time features. Your Community votes directly shape what gets prioritised next. 🚀
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
          background: "linear-gradient(135deg, rgba(172,181,255,0.10) 0%, rgba(142,193,222,0.06) 100%)",
          borderColor: "rgba(172,181,255,0.28)",
          boxShadow: "0 0 40px rgba(172,181,255,0.10)",
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <span className="text-sm font-black uppercase tracking-widest text-primary">
            Shape the Future
          </span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-foreground">
          Got an idea for Player4Hire?
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          Every great feature started as a suggestion. Share yours and the community votes on what gets built next.
        </p>

        <Link href="/community">
          <button
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #ACB5FF, #8090cc)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(172,181,255,0.35)",
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
          background: "linear-gradient(135deg, rgba(142,193,222,0.06) 0%, rgba(172,181,255,0.04) 100%)",
          borderColor: "rgba(142,193,222,0.22)",
          boxShadow: "0 0 30px rgba(142,193,222,0.06)",
        }}
      >
        <div className="shrink-0 h-14 w-14 rounded-2xl border flex items-center justify-center"
          style={{ background: "rgba(142,193,222,0.10)", borderColor: "rgba(142,193,222,0.28)" }}>
          <MessageSquare className="h-7 w-7" style={{ color: "#8EC1DE" }} />
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "#ACB5FF" }}>
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
            background: "linear-gradient(135deg, #ACB5FF 0%, #8090cc 60%, #8EC1DE 100%)",
            boxShadow: "0 4px 24px rgba(172,181,255,0.30)",
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
