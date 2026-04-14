import React, { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Gamepad2, Users, Coins, Zap, Shield, Star, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/* ── floating particles canvas ─────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: {
      x: number; y: number; size: number;
      vx: number; vy: number; alpha: number; color: string;
    }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["rgba(168,85,247,", "rgba(34,211,238,", "rgba(255,255,255,"];

    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.8 + 0.4,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(Math.random() * 0.4 + 0.15),
        alpha: Math.random() * 0.5 + 0.15,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.0008;
        if (p.y < 0 || p.alpha <= 0) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 10;
          p.alpha = Math.random() * 0.5 + 0.15;
          p.vy = -(Math.random() * 0.4 + 0.15);
          p.vx = (Math.random() - 0.5) * 0.25;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ")";
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
    />
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
      className="relative group rounded-2xl border border-border/60 p-6 flex flex-col gap-4 transition-all duration-300 overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(15,12,30,0.95) 0%, rgba(8,8,20,0.98) 100%)",
      }}
    >
      {/* hover border glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px ${glowColor}` }}
      />
      {/* subtle corner accent */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 group-hover:opacity-20 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
      />

      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        style={{ boxShadow: `0 0 18px ${glowColor}40` }}
      >
        <div className={iconColor}>{icon}</div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-white uppercase tracking-wider text-base">{title}</h3>
          <span
            className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
            style={{ color: glowColor, borderColor: `${glowColor}50`, background: `${glowColor}10` }}
          >
            {tag}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>

      <div className="mt-auto pt-2">
        <div
          className="h-0.5 w-8 rounded-full group-hover:w-full transition-all duration-500"
          style={{ background: `linear-gradient(90deg, ${glowColor}, transparent)` }}
        />
      </div>
    </div>
  );
}

/* ── step item ──────────────────────────────────────────────── */
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white"
        style={{
          background: "linear-gradient(135deg, rgba(168,85,247,0.4), rgba(34,211,238,0.2))",
          border: "1px solid rgba(168,85,247,0.4)",
          boxShadow: "0 0 14px rgba(168,85,247,0.2)",
        }}
      >
        {n}
      </div>
      <div>
        <div className="font-bold text-white text-sm uppercase tracking-wide">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

/* ── main ───────────────────────────────────────────────────── */
export default function Home() {
  const { t } = useI18n();

  return (
    <div className="overflow-x-hidden">
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 overflow-hidden">
        {/* animated canvas particles */}
        <ParticleCanvas />

        {/* background orbs — softened, warmer */}
        <div
          className="absolute top-[-5%] left-[-8%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.13) 0%, transparent 65%)",
            animation: "float-slow 10s ease-in-out infinite",
            zIndex: 0,
          }}
        />
        <div
          className="absolute bottom-[0%] right-[-5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(34,211,238,0.09) 0%, transparent 65%)",
            animation: "float-slow-reverse 12s ease-in-out infinite",
            zIndex: 0,
          }}
        />

        {/* dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(168,85,247,0.09) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            zIndex: 0,
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 100%)",
          }}
        />

        {/* content */}
        <div className="relative max-w-3xl mx-auto w-full" style={{ zIndex: 2 }}>

          {/* eyebrow badge */}
          <div className="flex justify-center mb-6">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                background: "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.22)",
                color: "#c4b5fd",
              }}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              {t.home.badge}
            </div>
          </div>

          {/* headline */}
          <h1 className="font-black tracking-tight leading-tight mb-5">
            <span
              className="block text-white text-4xl sm:text-6xl md:text-7xl"
              style={{ textShadow: "0 2px 20px rgba(255,255,255,0.08)" }}
            >
              {t.home.headline1}
            </span>
            <span
              className="block text-4xl sm:text-6xl md:text-7xl"
              style={{
                color: "#b87ef7",
                textShadow: "0 0 40px rgba(168,85,247,0.55), 0 2px 12px rgba(168,85,247,0.3)",
              }}
            >
              {t.home.headline2}
            </span>
          </h1>

          {/* subheadline */}
          <p className="text-base sm:text-lg leading-relaxed mb-8 mx-auto max-w-2xl"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {t.home.subheadline}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <Link href="/signup">
              <button
                className="group w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-base text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                  boxShadow: "0 4px 20px rgba(147,51,234,0.4), 0 1px 4px rgba(0,0,0,0.3)",
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  {t.home.cta1}
                </span>
              </button>
            </Link>

            <Link href="/browse">
              <button
                className="group w-full sm:w-auto px-8 py-3.5 rounded-2xl font-semibold text-base transition-all duration-200 hover:brightness-125 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  {t.home.cta2}
                </span>
              </button>
            </Link>
          </div>

          {/* verification note */}
          <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.32)" }}>
            Verification helps keep Gamerbuddy safe — it usually takes 7–15 days
          </p>

          {/* trust bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                Join gamers worldwide •{" "}
                <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>2,450+ sessions</span>
                {" "}and counting
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap" style={{ color: "rgba(255,255,255,0.3)" }}>
              {["PC", "PlayStation", "Xbox", "Switch", "Steam Deck", "Mobile"].map((p, i, arr) => (
                <React.Fragment key={p}>
                  <span className="text-xs">{p}</span>
                  {i < arr.length - 1 && <span className="text-xs" style={{ color: "rgba(255,255,255,0.12)" }}>·</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* bottom fade into next section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, hsl(var(--background)))",
            zIndex: 2,
          }}
        />
      </section>

      {/* ═══════════════════ TOURNAMENT CTA ═══════════════════ */}
      <section className="px-4 pb-4 -mt-4">
        <Link href="/tournaments">
          <div
            className="max-w-5xl mx-auto rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer group transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "linear-gradient(135deg,rgba(251,191,36,0.12) 0%,rgba(168,85,247,0.10) 100%)",
              border: "1px solid rgba(251,191,36,0.30)",
              boxShadow: "0 0 40px rgba(251,191,36,0.08), 0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.40)" }}
              >
                <Trophy className="h-7 w-7 text-yellow-400" />
              </div>
              <div className="text-left">
                <p className="text-[15px] font-extrabold text-white">{t.home.cta3} — Crown the Champion!</p>
                <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>
                  2–100 players · Prize pools $100–$10,000 · 10% platform fee · {t.tournaments.free}
                </p>
              </div>
            </div>
            <div
              className="shrink-0 px-5 py-2.5 rounded-xl font-extrabold text-[13px] transition-all duration-150 group-hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#000", boxShadow: "0 0 20px rgba(251,191,36,0.30)" }}
            >
              {t.nav.tournaments}
            </div>
          </div>
        </Link>
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="relative px-4 pb-16 -mt-4">
        <div className="max-w-5xl mx-auto">
          {/* section label */}
          <div className="text-center mb-12 px-2">
            <div className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-purple-400/80 mb-5">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-purple-500/60" />
              Platform Features
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-purple-500/60" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              Why Gamers{" "}
              <span style={{ color: "#a855f7", textShadow: "0 0 24px rgba(168,85,247,0.5)" }}>
                Love
              </span>{" "}
              Gamerbuddy
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The safest and most fun way to find real teammates for co-op and multiplayer games — anywhere in the world.{" "}
              <span className="text-white/80 font-medium">Verified players, escrow-secured payments, real fun.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              iconBg="bg-cyan-500/15"
              iconColor="text-cyan-400"
              glowColor="rgba(34,211,238,0.8)"
              title="Find Teammates"
              desc="Post a request for any game, platform, and skill level. Get matched with friendly, verified players instantly."
              tag="Hiring"
            />
            <FeatureCard
              icon={<Coins className="h-6 w-6" />}
              iconBg="bg-primary/15"
              iconColor="text-primary"
              glowColor="rgba(168,85,247,0.8)"
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
              desc="No waiting. Browse live requests, bid in seconds, and jump into the game. Real-time chat built right in."
              tag="Fast"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section className="px-4 py-14">
        <div
          className="max-w-5xl mx-auto rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(168,85,247,0.07) 0%, rgba(34,211,238,0.04) 100%)",
            border: "1px solid rgba(168,85,247,0.2)",
          }}
        >
          {/* corner glow */}
          <div
            className="absolute top-0 left-0 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }}
          />

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* centre divider — absolute so it doesn't consume a grid cell */}
            <div
              className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(168,85,247,0.4), transparent)" }}
            />

            {/* left — hire side */}
            <div className="space-y-6">
              <div>
                <div
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3"
                  style={{
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.3)",
                    color: "rgba(34,211,238,1)",
                  }}
                >
                  <Users className="h-3.5 w-3.5" /> For Hirers
                </div>
                <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">
                  Get a Gamer in Minutes
                </h3>
              </div>
              <div className="space-y-5">
                <Step n={1} title="Post Your Request" desc="Choose your game, platform, skill level needed, and budget." />
                <Step n={2} title="Review Bids" desc="Skilled gamers place bids with their Discord and portfolio." />
                <Step n={3} title="Play &amp; Review" desc="Lock funds in escrow — session completes, you approve, both sides review. A 10% platform fee applies on every completed Quest/Job." />
              </div>
            </div>

            {/* right — earn side */}
            <div className="space-y-6">
              <div>
                <div
                  className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-3"
                  style={{
                    background: "rgba(168,85,247,0.1)",
                    border: "1px solid rgba(168,85,247,0.3)",
                    color: "rgba(168,85,247,1)",
                  }}
                >
                  <Coins className="h-3.5 w-3.5" /> For Gamers
                </div>
                <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">
                  Earn While You Play
                </h3>
              </div>
              <div className="space-y-5">
                <Step n={1} title="Build Your Quest" desc="List the games you play and the help you can offer." />
                <Step n={2} title="Bid on Requests" desc="Find requests that match your skills and place a competitive bid." />
                <Step n={3} title="Complete &amp; Cash Out" desc="Session done — you keep 90% of your bid. Gamerbuddy takes a transparent 10% platform fee per completed Quest/Job. Withdraw anytime." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUST STRIP ═══════════════════ */}
      <section className="px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {[
              { icon: <Shield className="h-5 w-5 text-green-400" />, label: "Escrow Protected", sub: "Funds held until session complete" },
              { icon: <Star className="h-5 w-5 text-yellow-400" />, label: "Verified Reviews", sub: "Both sides must review" },
              { icon: <Zap className="h-5 w-5 text-cyan-400" />, label: "Real-Time Chat", sub: "Built-in messaging + voice" },
              { icon: <Coins className="h-5 w-5 text-amber-400" />, label: "Transparent 10% Fee", sub: "Gamers keep 90% of every job. No hidden charges." },
            ].map(({ icon, label, sub }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center gap-2.5 p-5 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  {icon}
                </div>
                <div className="font-bold text-white text-sm">{label}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ BOTTOM CTA ═══════════════════ */}
      <section className="px-4 pb-20 pt-8">
        <div
          className="relative max-w-3xl mx-auto rounded-3xl text-center overflow-hidden px-8 py-14 sm:py-16"
          style={{
            background: "linear-gradient(135deg, rgba(147,51,234,0.25) 0%, rgba(124,58,237,0.12) 50%, rgba(34,211,238,0.08) 100%)",
            border: "1px solid rgba(168,85,247,0.3)",
            boxShadow: "0 0 60px rgba(168,85,247,0.12), inset 0 0 60px rgba(168,85,247,0.04)",
          }}
        >
          {/* glow orbs inside CTA */}
          <div
            className="absolute top-0 right-0 w-60 h-60 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)" }}
          />

          <div className="relative space-y-5">
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-1">
              {t.home.finalCta}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight">
              Your Next Session<br />Starts Here
            </h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
              Join thousands of gamers worldwide already hiring and earning on Gamerbuddy. Free to sign up.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/signup">
                <button
                  className="relative overflow-hidden group px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white w-full sm:w-auto"
                  style={{
                    background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                    boxShadow: "0 0 28px rgba(168,85,247,0.5), 0 4px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    {t.home.finalCtaBtn}
                  </span>
                  <div
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
                  />
                </button>
              </Link>
              <Link href="/browse">
                <button
                  className="px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white/70 hover:text-white transition-colors w-full sm:w-auto"
                  style={{
                    border: "1.5px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {t.home.cta2}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
