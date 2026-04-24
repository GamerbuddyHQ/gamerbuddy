import React from "react";
import { Link } from "wouter";
import { Gamepad2, Users, Coins, Zap, Shield, Star, Trophy, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

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
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(190,100%,32%) 100%)",
          border: "1px solid hsl(var(--primary) / 0.5)",
          boxShadow: "0 0 18px hsl(var(--primary) / 0.30)",
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
          background: "linear-gradient(90deg, rgba(161,255,79,0.12) 0%, rgba(161,255,79,0.10) 100%)",
          borderBottom: "1px solid rgba(161,255,79,0.20)",
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
        {/* Content */}
        <div className="relative w-full max-w-5xl mx-auto" style={{ zIndex: 2 }}>

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-sm font-bold"
              style={{
                background: "rgba(161,255,79,0.15)",
                border: "1px solid rgba(161,255,79,0.40)",
                color: "hsl(var(--primary))",
                boxShadow: "0 0 24px rgba(161,255,79,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
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
                background: "linear-gradient(135deg, #A1FF4F 0%, #A1FF4F 40%, #88cc33 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 32px rgba(161,255,79,0.60))",
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
                  background: "linear-gradient(135deg, #FF3B5C 0%, #cc2a47 100%)",
                  boxShadow: "0 8px 32px rgba(255,59,92,0.50), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
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
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(161,255,79,0.45)";
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
              iconBg="bg-cyan-500/15"
              iconColor="text-cyan-400"
              glowColor="rgba(161,255,79,0.8)"
              title="Find Teammates"
              desc="Post a request for any game, platform, and skill level. Get matched with friendly, verified players instantly."
              tag="Hiring"
            />
            <FeatureCard
              icon={<Coins className="h-6 w-6" />}
              iconBg="bg-primary/15"
              iconColor="text-primary"
              glowColor="rgba(161,255,79,0.8)"
              title="Get Paid to Play"
              desc="Accept requests, complete gaming sessions, and withdraw your earnings. Turn your skills into real money."
              tag="Earnings"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              iconBg="bg-yellow-500/15"
              iconColor="text-yellow-400"
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
            background: "linear-gradient(135deg, rgba(0,150,120,0.08) 0%, rgba(161,255,79,0.05) 100%)",
            border: "1px solid rgba(161,255,79,0.22)",
            boxShadow: "0 4px 40px rgba(0,0,0,0.20)",
          }}
        >
          {/* top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(161,255,79,0.5), rgba(161,255,79,0.3), transparent)" }}
          />

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
            {/* Divider */}
            <div
              className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(161,255,79,0.35), rgba(161,255,79,0.20), transparent)" }}
            />

            {/* Left — Hirers */}
            <div className="space-y-6">
              <div>
                <div
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3"
                  style={{
                    background: "rgba(161,255,79,0.10)",
                    border: "1px solid rgba(161,255,79,0.30)",
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
                    background: "rgba(161,255,79,0.12)",
                    border: "1px solid rgba(161,255,79,0.35)",
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
              { icon: <Shield className="h-5 w-5 text-green-400" />, label: "Escrow Protected", sub: "Funds held until session complete", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.20)" },
              { icon: <Star className="h-5 w-5 text-yellow-400" />, label: "Verified Reviews", sub: "Both sides must leave a review", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.20)" },
              { icon: <Zap className="h-5 w-5 text-cyan-400" />, label: "Instant Alerts", sub: "Real-time bids, starts, and payments", bg: "rgba(161,255,79,0.08)", border: "rgba(161,255,79,0.20)" },
              { icon: <Trophy className="h-5 w-5 text-amber-400" />, label: "Transparent 10% Fee", sub: "Gamers keep 90% — no hidden charges", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.20)" },
            ].map(({ icon, label, sub, bg, border }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl transition-all duration-200 hover:brightness-110"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.05)" }}
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
            background: "linear-gradient(135deg, rgba(45,75,18,0.75) 0%, rgba(110,68,255,0.28) 50%, rgba(80,130,35,0.18) 100%)",
            border: "1px solid rgba(0,200,170,0.28)",
            boxShadow: "0 0 80px rgba(110,68,255,0.18), inset 0 0 60px rgba(0,80,60,0.10)",
          }}
        >
          {/* top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,190,0.65), transparent)" }}
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
                    background: "linear-gradient(135deg, #FF3B5C 0%, #cc2a47 100%)",
                    boxShadow: "0 0 32px rgba(255,59,92,0.45), 0 4px 16px rgba(0,0,0,0.30)",
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
