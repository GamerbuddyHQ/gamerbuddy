import React from "react";
import { Link } from "wouter";
import { Gamepad2, Users, Coins, Zap, Shield, Star, Trophy, ChevronRight, Monitor, Smartphone, Crosshair, Keyboard, Mouse, Headphones } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/* ── floating gaming icons ──────────────────────────────────── */
type IconProps = { size: number; color: string };

const NintendoSwitch = ({ size, color }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="4" width="6.5" height="16" rx="3.5" />
    <rect x="8.5" y="7.5" width="7" height="9" rx="1" />
    <rect x="16" y="4" width="6.5" height="16" rx="3.5" />
    <circle cx="4.75" cy="8.5" r="1" fill={color} stroke="none" />
    <line x1="3.5" y1="12.5" x2="6" y2="12.5" />
    <line x1="4.75" y1="11.25" x2="4.75" y2="13.75" />
    <circle cx="19.25" cy="15.5" r="1" fill={color} stroke="none" />
  </svg>
);

const PSController = ({ size, color }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 9.5c0-2 1.5-3.5 3-3.5h11c1.5 0 3 1.5 3 3.5v4.5l-1.5 3.5H5l-1.5-3.5V9.5z" />
    <path d="M5 14l-2.5 5" />
    <path d="M19 14l2.5 5" />
    <circle cx="8.5" cy="13" r="2" />
    <circle cx="14.5" cy="10" r="2" />
    <circle cx="17.5" cy="13" r="0.8" fill={color} stroke="none" />
    <circle cx="16" cy="10.5" r="0.8" fill={color} stroke="none" />
  </svg>
);

const XboxController = ({ size, color }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10c0-2 1.5-4 3-4h10c1.5 0 3 2 3 4v4.5l-2 4H6l-2-4V10z" />
    <path d="M6 14.5L4 20" />
    <path d="M18 14.5L20 20" />
    <circle cx="9" cy="13.5" r="2" />
    <circle cx="15" cy="10" r="2" />
    <circle cx="17" cy="13" r="0.75" fill={color} stroke="none" />
    <circle cx="17" cy="11" r="0.75" fill={color} stroke="none" />
    <circle cx="16" cy="12" r="0.75" fill={color} stroke="none" />
    <circle cx="18" cy="12" r="0.75" fill={color} stroke="none" />
  </svg>
);

const JoystickSVG = ({ size, color }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="3.5" />
    <line x1="12" y1="10.5" x2="12" y2="17" />
    <ellipse cx="12" cy="19" rx="5.5" ry="2" />
    <line x1="9" y1="5.5" x2="6" y2="3.5" />
    <line x1="15" y1="5.5" x2="18" y2="3.5" />
  </svg>
);

type FloatingEntry = {
  render: (size: number, color: string) => React.ReactNode;
  left: number; top: number; size: number;
  opacity: number; variant: 1|2|3; dur: number; delay: number; color: string;
};

const GAMING_ICONS: FloatingEntry[] = [
  { render: (s,c) => <Gamepad2    size={s} color={c} />, left:  7, top: 10, size: 26, opacity: 0.22, variant: 1, dur: 14, delay:  0, color: '#B15EED' },
  { render: (s,c) => <NintendoSwitch size={s} color={c} />, left: 86, top: 14, size: 24, opacity: 0.18, variant: 2, dur: 18, delay:  2, color: '#B15EED' },
  { render: (s,c) => <PSController size={s} color={c} />, left: 14, top: 70, size: 28, opacity: 0.20, variant: 3, dur: 20, delay:  1, color: '#B15EED' },
  { render: (s,c) => <XboxController size={s} color={c} />, left: 79, top: 62, size: 24, opacity: 0.17, variant: 1, dur: 17, delay:  4, color: '#ffffff' },
  { render: (s,c) => <JoystickSVG  size={s} color={c} />, left: 48, top:  6, size: 20, opacity: 0.16, variant: 2, dur: 22, delay:  7, color: '#ffffff' },
  { render: (s,c) => <Headphones   size={s} color={c} />, left: 91, top: 42, size: 22, opacity: 0.19, variant: 3, dur: 15, delay:  3, color: '#B15EED' },
  { render: (s,c) => <Keyboard     size={s} color={c} />, left: 24, top: 82, size: 24, opacity: 0.16, variant: 1, dur: 21, delay:  5, color: '#ffffff' },
  { render: (s,c) => <Mouse        size={s} color={c} />, left: 70, top: 80, size: 20, opacity: 0.20, variant: 2, dur: 13, delay:  6, color: '#B15EED' },
  { render: (s,c) => <Smartphone   size={s} color={c} />, left:  4, top: 48, size: 18, opacity: 0.15, variant: 3, dur: 19, delay:  9, color: '#ffffff' },
  { render: (s,c) => <Crosshair    size={s} color={c} />, left: 61, top: 87, size: 22, opacity: 0.18, variant: 1, dur: 24, delay:  2, color: '#B15EED' },
  { render: (s,c) => <Monitor      size={s} color={c} />, left: 35, top: 12, size: 20, opacity: 0.15, variant: 2, dur: 16, delay: 10, color: '#ffffff' },
  { render: (s,c) => <Gamepad2     size={s} color={c} />, left: 74, top: 28, size: 18, opacity: 0.13, variant: 3, dur: 26, delay: 12, color: '#B15EED' },
  { render: (s,c) => <Headphones   size={s} color={c} />, left: 18, top: 32, size: 16, opacity: 0.14, variant: 1, dur: 23, delay: 14, color: '#ffffff' },
  { render: (s,c) => <Crosshair    size={s} color={c} />, left: 55, top: 55, size: 16, opacity: 0.12, variant: 2, dur: 28, delay:  8, color: '#B15EED' },
  { render: (s,c) => <Mouse        size={s} color={c} />, left: 40, top: 40, size: 14, opacity: 0.11, variant: 3, dur: 30, delay: 16, color: '#ffffff' },
];

function FloatingGamingIcons() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {GAMING_ICONS.map((item, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            opacity: item.opacity,
            animation: `float-icon-${item.variant} ${item.dur}s ease-in-out ${item.delay}s infinite`,
          }}
        >
          {item.render(item.size, item.color)}
        </div>
      ))}
    </div>
  );
}

/* ── feature card ───────────────────────────────────────────── */
function FeatureCard({
  icon,
  iconBg,
  iconColor,
  glowColor,
  title,
  desc,
  tag,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  glowColor: string;
  title: string;
  desc: string;
  tag: string;
}) {
  return (
    <div
      className="relative group rounded-2xl border border-border/60 bg-card p-7 flex flex-col gap-5 transition-all duration-300 overflow-hidden hover:border-primary/50"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px ${glowColor}28, 0 0 60px ${glowColor}10`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 16px rgba(0,0,0,0.12)";
      }}
    >
      {/* top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
      />
      {/* corner accent glow */}
      <div
        className="absolute top-0 right-0 w-36 h-36 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor}20 0%, transparent 70%)` }}
      />

      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
          style={{ boxShadow: `0 0 20px ${glowColor}35` }}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-extrabold text-foreground tracking-wide text-base">{title}</h3>
            <span
              className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
              style={{ color: glowColor, borderColor: `${glowColor}50`, background: `${glowColor}14` }}
            >
              {tag}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>

      <div
        className="h-px w-8 rounded-full group-hover:w-full transition-all duration-500 mt-auto"
        style={{ background: `linear-gradient(90deg, ${glowColor}, transparent)` }}
      />
    </div>
  );
}

/* ── step item ──────────────────────────────────────────────── */
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start group">
      <div
        className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white transition-all duration-200 group-hover:scale-105"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
          boxShadow: "0 0 14px rgba(124,58,237,0.35)",
        }}
      >
        {n}
      </div>
      <div className="pt-1">
        <div className="font-bold text-foreground text-sm uppercase tracking-wide mb-0.5">{title}</div>
        <div className="text-sm text-muted-foreground leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

/* ── main ───────────────────────────────────────────────────── */
export default function Home() {
  const { t } = useI18n();

  return (
    <div className="overflow-x-hidden">

      {/* ── Phase 1 Banner ── */}
      <div
        className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-center"
        style={{
          background: "linear-gradient(90deg, rgba(177,94,237,0.12) 0%, rgba(177,94,237,0.10) 100%)",
          borderBottom: "1px solid rgba(177,94,237,0.20)",
        }}
      >
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)", animation: "pulse 1.5s infinite" }}
        />
        <span style={{ color: "var(--text-on-surface)", opacity: 0.82 }}>
          Player4Hire is currently in Phase 1 — Core Hiring Only. Tournaments and more features are coming soon!{" "}
          <Link href="/roadmap" className="font-semibold hover:underline" style={{ color: "hsl(var(--primary))" }}>
            View Roadmap →
          </Link>
        </span>
      </div>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-14 pb-12 lg:pt-24 lg:pb-16 overflow-hidden min-h-[600px] lg:min-h-[720px]">
        <FloatingGamingIcons />
        {/* Content */}
        <div className="relative w-full max-w-5xl mx-auto" style={{ zIndex: 2 }}>

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-sm font-bold"
              style={{
                background: "rgba(177,94,237,0.15)",
                border: "1px solid rgba(177,94,237,0.40)",
                color: "hsl(var(--primary))",
                boxShadow: "0 0 24px rgba(177,94,237,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <Gamepad2 className="h-4 w-4" />
              {t.home.badge}
            </div>
          </div>

          {/* Headline */}
          <h1 className="font-black tracking-tight leading-[1.02] mb-5">
            <span className="block text-white text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6rem] drop-shadow-sm">
              {t.home.headline1}
            </span>
            <span
              className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6rem]"
              style={{
                background: "linear-gradient(135deg, #B15EED 0%, #B15EED 40%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 32px rgba(177,94,237,0.60))",
              }}
            >
              {t.home.headline2}
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-base sm:text-lg lg:text-xl leading-relaxed mb-8 mx-auto max-w-xl"
            style={{ color: "rgba(203,213,225,0.80)" }}
          >
            {t.home.subheadline}
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 mb-6">
            <Link href="/signup">
              <button
                className="relative overflow-hidden group w-full sm:w-auto px-10 py-4 rounded-2xl font-bold text-base lg:text-lg text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
                  boxShadow: "0 4px 18px rgba(124,58,237,0.45), 0 2px 8px rgba(0,0,0,0.35)",
                  minWidth: "210px",
                }}
              >
                {/* shimmer */}
                <div
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)" }}
                />
                <span className="relative flex items-center justify-center gap-2.5">
                  <Users className="h-5 w-5" />
                  {t.home.cta1}
                </span>
              </button>
            </Link>

            <Link href="/browse">
              <button
                className="group w-full sm:w-auto px-10 py-4 rounded-2xl font-semibold text-base lg:text-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.18)",
                  color: "rgba(226,232,240,0.85)",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
                  minWidth: "210px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(177,94,237,0.45)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.18)";
                }}
              >
                <span className="flex items-center justify-center gap-2.5">
                  <Gamepad2 className="h-5 w-5" />
                  {t.home.cta2}
                </span>
              </button>
            </Link>
          </div>

          {/* Trust cluster — tight to buttons */}
          <div className="space-y-2">
            <p className="text-center text-xs" style={{ color: "rgba(148,163,184,0.65)" }}>
              Verification helps keep Player4Hire safe — it usually takes 24–48 hours
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                Join gamers worldwide •{" "}
                <span className="text-foreground font-semibold">2,450+ sessions</span>
                {" "}and counting
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {["PC", "PlayStation", "Xbox", "Switch", "Steam Deck", "Mobile"].map((p, i, arr) => (
                <React.Fragment key={p}>
                  <span className="text-xs text-muted-foreground/60">{p}</span>
                  {i < arr.length - 1 && <span className="text-xs text-muted-foreground/30">·</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--background)))", zIndex: 2 }}
        />
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="relative px-4 pt-2 pb-12">
        <div className="max-w-[1400px] mx-auto">

          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-primary/60 mb-3">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/50" />
              Core Features
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/50" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground leading-tight mb-3">
              How Player4Hire Works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Post a request, get bids from verified gamers, play together — funds held in escrow until your session is complete.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              iconBg="bg-[#1A1A1A]"
              iconColor="text-[#B15EED]"
              glowColor="rgba(177,94,237,0.75)"
              title="Find Teammates"
              desc="Post a request for any game, platform, and skill level. Get matched with friendly, verified players instantly."
              tag="Hiring"
            />
            <FeatureCard
              icon={<Coins className="h-6 w-6" />}
              iconBg="bg-[#1A1A1A]"
              iconColor="text-[#B15EED]"
              glowColor="rgba(177,94,237,0.75)"
              title="Get Paid to Play"
              desc="Accept requests, complete gaming sessions, and withdraw your earnings. Turn your skills into real money."
              tag="Earnings"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              iconBg="bg-[#1A1A1A]"
              iconColor="text-[#B15EED]"
              glowColor="rgba(234,179,8,0.8)"
              title="Instant Action"
              desc="No waiting. Browse live requests, bid in seconds, and jump into the game. Real-time notifications built in."
              tag="Fast"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="px-4 py-8 lg:py-12">
        <div
          className="max-w-[1400px] mx-auto rounded-3xl p-8 sm:p-10 lg:p-14 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(0,150,120,0.08) 0%, rgba(177,94,237,0.05) 100%)",
            border: "1px solid rgba(177,94,237,0.22)",
            boxShadow: "0 4px 40px rgba(0,0,0,0.20)",
          }}
        >
          {/* top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(177,94,237,0.5), rgba(177,94,237,0.3), transparent)" }}
          />

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
            {/* Divider */}
            <div
              className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(177,94,237,0.35), rgba(177,94,237,0.20), transparent)" }}
            />

            {/* Left — Hirers */}
            <div className="space-y-6">
              <div>
                <div
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3"
                  style={{
                    background: "rgba(177,94,237,0.10)",
                    border: "1px solid rgba(177,94,237,0.30)",
                    color: "rgb(34,211,238)",
                  }}
                >
                  <Users className="h-3.5 w-3.5" /> For Hirers
                </div>
                <h3 className="text-xl lg:text-2xl font-extrabold text-foreground uppercase tracking-tight leading-tight">
                  Get a Gamer<br className="hidden lg:block" /> in Minutes
                </h3>
              </div>
              <div className="space-y-5">
                <Step n={1} title="Post Your Request" desc="Choose your game, platform, skill level needed, and set your budget." />
                <Step n={2} title="Review Bids" desc="Skilled gamers place bids with their Discord handle and portfolio." />
                <Step n={3} title="Play &amp; Review" desc="Lock funds in escrow — session completes, you approve, both sides review. A 10% platform fee applies." />
              </div>
            </div>

            {/* Right — Gamers */}
            <div className="space-y-6">
              <div>
                <div
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3"
                  style={{
                    background: "rgba(177,94,237,0.12)",
                    border: "1px solid rgba(177,94,237,0.35)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  <Coins className="h-3.5 w-3.5" /> For Gamers
                </div>
                <h3 className="text-xl lg:text-2xl font-extrabold text-foreground uppercase tracking-tight leading-tight">
                  Earn While<br className="hidden lg:block" /> You Play
                </h3>
              </div>
              <div className="space-y-5">
                <Step n={1} title="Set Up Your Profile" desc="List your games, ranks, and the type of help you can offer to hirers." />
                <Step n={2} title="Bid on Requests" desc="Find requests that match your skills and place a competitive bid." />
                <Step n={3} title="Complete &amp; Cash Out" desc="Session done — you keep 90% of your bid. Withdraw to your bank anytime." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUST STRIP ═══════════════════ */}
      <section className="px-4 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <Shield className="h-5 w-5 text-[#B15EED]" />, label: "Escrow Protected", sub: "Funds held until session complete", bg: "rgba(177,94,237,0.04)", border: "rgba(177,94,237,0.18)" },
              { icon: <Star className="h-5 w-5 text-[#B15EED]" />, label: "Verified Reviews", sub: "Both sides must leave a review", bg: "rgba(177,94,237,0.04)", border: "rgba(177,94,237,0.18)" },
              { icon: <Zap className="h-5 w-5 text-[#B15EED]" />, label: "Instant Alerts", sub: "Real-time bids, starts, and payments", bg: "rgba(177,94,237,0.04)", border: "rgba(177,94,237,0.18)" },
              { icon: <Trophy className="h-5 w-5 text-[#B15EED]" />, label: "Transparent 10% Fee", sub: "Gamers keep 90% — no hidden charges", bg: "rgba(177,94,237,0.04)", border: "rgba(177,94,237,0.18)" },
            ].map(({ icon, label, sub, bg, border }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl transition-all duration-200 hover:brightness-110"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "#1A1A1A" }}
                >
                  {icon}
                </div>
                <div className="font-bold text-foreground text-sm">{label}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ BOTTOM CTA ═══════════════════ */}
      <section className="px-4 pb-20 pt-6">
        <div
          className="relative max-w-4xl mx-auto rounded-3xl text-center overflow-hidden px-8 py-14 sm:py-16 lg:py-20"
          style={{
            background: "#111111",
            border: "1px solid rgba(177,94,237,0.22)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.50)",
          }}
        >
          {/* top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(177,94,237,0.30), transparent)" }}
          />

          <div className="relative space-y-5">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80 mb-1">
              {t.home.finalCta}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground uppercase tracking-tight leading-tight">
              Your Next Session<br />Starts Here
            </h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
              Join thousands of gamers worldwide already hiring and earning on Player4Hire. Free to sign up.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-3">
              <Link href="/signup">
                <button
                  className="relative overflow-hidden group px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white w-full sm:w-auto transition-all hover:brightness-110 hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)",
                    boxShadow: "0 4px 18px rgba(124,58,237,0.45), 0 2px 8px rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)" }}
                  />
                  <span className="relative flex items-center justify-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    {t.home.finalCtaBtn}
                  </span>
                </button>
              </Link>
              <Link href="/browse">
                <button
                  className="px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all hover:brightness-110 hover:scale-[1.03] active:scale-[0.97] w-full sm:w-auto flex items-center justify-center gap-2"
                  style={{
                    border: "1.5px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(226,232,240,0.80)",
                  }}
                >
                  {t.home.cta2}
                  <ChevronRight className="h-4 w-4 opacity-60" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
