import React, { useEffect, useRef } from "react";
import { Link } from "wouter";
import { Gamepad2, Users, Coins, Zap, Shield, Star, ChevronRight, MonitorPlay, Tv2, Smartphone } from "lucide-react";

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

/* ── stat item ──────────────────────────────────────────────── */
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-black text-white text-sm">{value}</span>
      <span className="text-muted-foreground text-sm">{label}</span>
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
  return (
    <div className="overflow-x-hidden">
      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* animated canvas particles */}
        <ParticleCanvas />

        {/* background orbs */}
        <div
          className="absolute top-[-10%] left-[-5%] w-[55vw] h-[55vw] max-w-[680px] max-h-[680px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 65%)",
            animation: "float-slow 9s ease-in-out infinite",
            zIndex: 0,
            filter: "blur(2px)",
          }}
        />
        <div
          className="absolute bottom-[5%] right-[-8%] w-[45vw] h-[45vw] max-w-[560px] max-h-[560px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(34,211,238,0.13) 0%, transparent 65%)",
            animation: "float-slow-reverse 11s ease-in-out infinite",
            zIndex: 0,
            filter: "blur(2px)",
          }}
        />
        <div
          className="absolute top-[40%] left-[30%] w-[30vw] h-[30vw] max-w-[380px] max-h-[380px] rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)",
            animation: "float-slow 14s ease-in-out infinite 3s",
            zIndex: 0,
          }}
        />

        {/* dot grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(168,85,247,0.12) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            zIndex: 0,
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 100%)",
          }}
        />

        {/* scanline accent */}
        <div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.4) 50%, transparent 100%)",
            animation: "scanline 8s linear infinite",
            zIndex: 1,
          }}
        />

        {/* content */}
        <div className="relative space-y-7 max-w-4xl mx-auto" style={{ zIndex: 2 }}>
          {/* eyebrow badge */}
          <div className="inline-flex items-center gap-2.5 border rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{
              borderColor: "rgba(168,85,247,0.4)",
              background: "rgba(168,85,247,0.08)",
              color: "rgba(168,85,247,1)",
              boxShadow: "0 0 20px rgba(168,85,247,0.12)",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary"
              style={{ animation: "hero-glow-pulse 2s ease-in-out infinite", boxShadow: "0 0 6px rgba(168,85,247,0.9)" }}
            />
            Gaming Marketplace · Est. 2024
          </div>

          {/* headline */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase leading-[0.9]">
            <span
              className="block"
              style={{
                color: "#f0e6ff",
                textShadow: "0 0 40px rgba(168,85,247,0.3)",
              }}
            >
              Level Up
            </span>
            <span
              className="relative inline-block mt-1"
              style={{
                background: "linear-gradient(90deg, #c084fc 0%, #a855f7 40%, #7c3aed 70%, #22d3ee 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 24px rgba(168,85,247,0.7))",
              }}
            >
              Your Squad
              {/* underline glow */}
              <span
                className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full"
                style={{
                  background: "linear-gradient(90deg, rgba(168,85,247,0.9), rgba(34,211,238,0.7))",
                  boxShadow: "0 0 14px rgba(168,85,247,0.7)",
                }}
              />
            </span>
          </h1>

          {/* subheadline */}
          <p className="text-lg sm:text-xl text-white/70 max-w-xl mx-auto leading-relaxed font-medium">
            Hire skilled &amp; friendly gamers for co-op and multiplayer.{" "}
            <span className="text-white/90 font-semibold">No more toxic randoms.</span>
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/signup">
              <button
                className="relative overflow-hidden group w-full sm:w-auto px-10 py-4 rounded-xl font-black text-base uppercase tracking-widest text-white transition-all duration-300"
                style={{
                  background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)",
                  boxShadow: "0 0 30px rgba(168,85,247,0.45), 0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <span className="relative z-10 flex items-center gap-2.5">
                  <Gamepad2 className="h-4.5 w-4.5" style={{ width: "1.125rem", height: "1.125rem" }} />
                  Join the Lair
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                {/* shimmer overlay */}
                <div
                  className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
                />
              </button>
            </Link>

            <Link href="/browse">
              <button
                className="group w-full sm:w-auto px-10 py-4 rounded-xl font-bold text-base uppercase tracking-widest transition-all duration-300"
                style={{
                  border: "1.5px solid rgba(168,85,247,0.35)",
                  background: "rgba(168,85,247,0.06)",
                  color: "rgba(255,255,255,0.75)",
                  boxShadow: "0 0 0 0 rgba(168,85,247,0)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.15)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.7)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.35)";
                }}
              >
                <span className="flex items-center gap-2">
                  Browse Requests
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>
          </div>

          {/* trust stats */}
          <div
            className="inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 px-6 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <StatItem value="2,450+" label="gamers trust us" />
            <span className="text-border hidden sm:block">|</span>
            <div className="flex items-center gap-2">
              <MonitorPlay className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">PC</span>
            </div>
            <div className="flex items-center gap-2">
              <Tv2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Console</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Mobile</span>
            </div>
            <span className="text-border hidden sm:block">|</span>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="text-sm text-muted-foreground ml-1">4.9 rating</span>
            </div>
          </div>
        </div>

        {/* bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent, hsl(var(--background)))",
            zIndex: 2,
          }}
        />
      </section>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section className="relative px-4 pb-16 -mt-4">
        <div className="max-w-5xl mx-auto">
          {/* section label */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              <div className="h-px w-8 bg-border" />
              Why Gamerbuddy
              <div className="h-px w-8 bg-border" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
              Built for real gamers
            </h2>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative">
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
                <Step n={3} title="Play &amp; Review" desc="Lock in escrow, session completes, both sides review." />
              </div>
            </div>

            {/* divider */}
            <div className="hidden md:flex items-center justify-center">
              <div
                className="w-px h-full"
                style={{ background: "linear-gradient(to bottom, transparent, rgba(168,85,247,0.4), transparent)" }}
              />
            </div>

            {/* right — earn side */}
            <div className="space-y-6 md:-ml-8">
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
                <Step n={3} title="Complete &amp; Cash Out" desc="Session done — earnings land in your wallet, withdraw anytime." />
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
              { icon: <Shield className="h-5 w-5 text-primary" />, label: "ID Verified Gamers", sub: "Verified badge on trusted profiles" },
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
              Ready to play?
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight leading-tight">
              Your Next Session<br />Starts Here
            </h2>
            <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
              Join 2,450+ gamers already hiring and earning on Gamerbuddy. Free to sign up.
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
                    Create Free Account
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
                  Browse Without Account
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
