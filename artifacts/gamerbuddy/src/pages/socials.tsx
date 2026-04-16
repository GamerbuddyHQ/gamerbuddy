import React, { useState } from "react";
import { useTheme } from "@/lib/theme";

/* ── Platform data ───────────────────────────────────────────────────────── */
const SOCIALS = [
  {
    id: "discord",
    label: "Discord",
    handle: "Gamerbuddy Server",
    url: "https://discord.gg/pJcmECke",
    tagline: "Chat live, find squads & get support on Discord",
    description: "Join our Discord server to hang with the community, find squad members, get platform support, share highlights, and be first to hear about drops and events.",
    subscribers: "Join Server",
    colors: {
      bg: "rgba(88,101,242,0.08)",
      bgHover: "rgba(88,101,242,0.16)",
      border: "rgba(88,101,242,0.25)",
      borderHover: "rgba(88,101,242,0.60)",
      glow: "rgba(88,101,242,0.30)",
      text: "#7289da",
      pill: "rgba(88,101,242,0.18)",
      btn: "linear-gradient(135deg,#5865F2,#4752c4)",
      btnShadow: "rgba(88,101,242,0.50)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.032.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    handle: "@GamerbuddyHQ",
    url: "https://www.youtube.com/@GamerbuddyHQ",
    tagline: "Watch gameplay, streams & announcements on YouTube",
    description: "Catch live streams, tournament replays, highlight reels, gaming tips, and platform updates — all on our YouTube channel.",
    subscribers: "Subscribe",
    colors: {
      bg: "rgba(255,0,0,0.07)",
      bgHover: "rgba(255,0,0,0.13)",
      border: "rgba(255,0,0,0.22)",
      borderHover: "rgba(255,0,0,0.55)",
      glow: "rgba(255,0,0,0.22)",
      text: "#ff3b3b",
      pill: "rgba(255,59,59,0.15)",
      btn: "linear-gradient(135deg,#ff0000,#cc0000)",
      btnShadow: "rgba(255,0,0,0.40)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X (Twitter)",
    handle: "@GamerbuddyHQ",
    url: "https://x.com/GamerbuddyHQ",
    tagline: "Follow us on X for live updates & drops",
    description: "Get breaking news, giveaway announcements, gaming hot takes, community shoutouts, and real-time platform updates.",
    subscribers: "Follow",
    colors: {
      bg: "rgba(255,255,255,0.04)",
      bgHover: "rgba(255,255,255,0.08)",
      border: "rgba(255,255,255,0.14)",
      borderHover: "rgba(255,255,255,0.40)",
      glow: "rgba(255,255,255,0.10)",
      text: "#e5e7eb",
      pill: "rgba(229,231,235,0.12)",
      btn: "linear-gradient(135deg,#222,#444)",
      btnShadow: "rgba(255,255,255,0.15)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    handle: "@gamerbuddy",
    url: "https://instagram.com/gamerbuddy",
    tagline: "Epic shots & community moments on Instagram",
    description: "Scroll through stunning gameplay screenshots, community highlights, behind-the-scenes content, and squad moments.",
    subscribers: "Follow",
    colors: {
      bg: "rgba(225,48,108,0.07)",
      bgHover: "rgba(225,48,108,0.13)",
      border: "rgba(225,48,108,0.22)",
      borderHover: "rgba(225,48,108,0.55)",
      glow: "rgba(225,48,108,0.22)",
      text: "#f06292",
      pill: "rgba(240,98,146,0.15)",
      btn: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
      btnShadow: "rgba(225,48,108,0.40)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    id: "gamejolt",
    label: "GameJolt",
    handle: "@Gamerbuddy",
    url: "https://gamejolt.com/@Gamerbuddy",
    tagline: "Find us on GameJolt for dev updates & stickers",
    description: "Explore our GameJolt presence with game pages, developer logs, community stickers, badges, and achievements.",
    subscribers: "Follow",
    colors: {
      bg: "rgba(44,204,120,0.07)",
      bgHover: "rgba(44,204,120,0.13)",
      border: "rgba(44,204,120,0.22)",
      borderHover: "rgba(44,204,120,0.55)",
      glow: "rgba(44,204,120,0.22)",
      text: "#2ccc78",
      pill: "rgba(44,204,120,0.15)",
      btn: "linear-gradient(135deg,#2ccc78,#1aaa60)",
      btnShadow: "rgba(44,204,120,0.40)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 8.25h-3v7.5h-4.5v-7.5h-3v-1.5h10.5v1.5z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: "gamerbuddy",
    url: "https://facebook.com/gamerbuddy",
    tagline: "Join our Facebook community for events & groups",
    description: "Stay in the loop with platform events, group discussions, community announcements, and exclusive Facebook giveaways.",
    subscribers: "Like & Follow",
    colors: {
      bg: "rgba(24,119,242,0.07)",
      bgHover: "rgba(24,119,242,0.13)",
      border: "rgba(24,119,242,0.22)",
      borderHover: "rgba(24,119,242,0.55)",
      glow: "rgba(24,119,242,0.22)",
      text: "#4d9ff5",
      pill: "rgba(77,159,245,0.15)",
      btn: "linear-gradient(135deg,#1877f2,#0d5dbf)",
      btnShadow: "rgba(24,119,242,0.40)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

/* ── Copy button ─────────────────────────────────────────────────────────── */
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        background: copied ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
        border: copied ? "1px solid rgba(34,197,94,0.40)" : "1px solid rgba(255,255,255,0.12)",
        color: copied ? "#4ade80" : "#9ca3af",
      }}
      title="Copy link"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
          Copy Link
        </>
      )}
    </button>
  );
}

/* ── Social Card ─────────────────────────────────────────────────────────── */
function SocialCard({ s }: { s: (typeof SOCIALS)[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex flex-col gap-5 rounded-2xl p-7 transition-all duration-300"
      style={{
        background: hovered ? s.colors.bgHover : s.colors.bg,
        border: `1.5px solid ${hovered ? s.colors.borderHover : s.colors.border}`,
        boxShadow: hovered ? `0 12px 40px ${s.colors.glow}` : "none",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: icon + name + copy */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300"
            style={{
              background: s.colors.bg,
              border: `1.5px solid ${s.colors.border}`,
              color: s.colors.text,
              transform: hovered ? "scale(1.12) rotate(-3deg)" : "scale(1)",
              boxShadow: hovered ? `0 0 20px ${s.colors.glow}` : "none",
            }}
          >
            {s.icon}
          </div>
          <div>
            <div className="font-black text-xl leading-tight" style={{ color: s.colors.text }}>
              {s.label}
            </div>
            <div
              className="text-xs font-bold mt-0.5 px-2 py-0.5 rounded-full inline-block font-mono"
              style={{ background: s.colors.pill, color: s.colors.text }}
            >
              {s.handle}
            </div>
          </div>
        </div>
        <CopyLinkButton url={s.url} />
      </div>

      {/* Tagline */}
      <p className="text-sm font-semibold" style={{ color: s.colors.text, opacity: 0.85 }}>
        {s.tagline}
      </p>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{s.description}</p>

      {/* CTA button */}
      <a
        href={s.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-5 text-[15px] font-black text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: s.colors.btn,
          boxShadow: hovered ? `0 4px 20px ${s.colors.btnShadow}` : "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {s.subscribers} on {s.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </a>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SocialsPage() {
  const { isDark } = useTheme();

  return (
    <div className="container max-w-5xl py-10 md:py-16 space-y-14">

      {/* ── Hero ── */}
      <div className="text-center space-y-5">
        <div
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full"
          style={{
            background: "rgba(168,85,247,0.12)",
            border: "1px solid rgba(168,85,247,0.35)",
            color: "#a855f7",
          }}
        >
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Official Channels
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-tight">
          Stay{" "}
          <span style={{ color: isDark ? "#a855f7" : "hsl(272,72%,42%)" }}>
            Connected
          </span>{" "}
          with Gamerbuddy
        </h1>

        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
          Follow us on all platforms for updates, tournaments, giveaways, and epic gaming moments!
        </p>

        {/* Superr.bio hub CTA */}
        <div className="flex justify-center pt-2">
          <a
            href="https://www.superr.bio/gamerbuddy"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-3 rounded-2xl px-7 py-4 font-black text-base text-white transition-all duration-300 hover:scale-[1.04] hover:brightness-110 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #22d3ee 100%)",
              boxShadow: "0 0 40px rgba(168,85,247,0.45), 0 4px 24px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-5 w-5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            All Socials &amp; Links
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>

        {/* Quick icon bar */}
        <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
          {SOCIALS.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.label}
              className="h-10 w-10 rounded-xl flex items-center justify-center border transition-all duration-200 hover:scale-110 hover:-translate-y-0.5"
              style={{
                color: s.colors.text,
                background: s.colors.bg,
                border: `1px solid ${s.colors.border}`,
              }}
            >
              <span className="h-5 w-5 flex items-center justify-center">
                {s.icon}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {SOCIALS.map((s) => (
          <SocialCard key={s.id} s={s} />
        ))}
      </div>

      {/* ── Squad CTA banner ── */}
      <div
        className="rounded-3xl px-8 py-10 text-center space-y-4"
        style={{
          background: "linear-gradient(135deg,rgba(168,85,247,0.12),rgba(34,211,238,0.07))",
          border: "1.5px solid rgba(168,85,247,0.25)",
          boxShadow: "0 0 60px rgba(168,85,247,0.08)",
        }}
      >
        <p className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
          Join the Gamerbuddy Squad 🎮
        </p>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Be the first to know about new features, exclusive tournaments, community events, and platform giveaways. Hit follow on any platform — we're active everywhere!
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {SOCIALS.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-all duration-200 hover:scale-105 hover:-translate-y-0.5"
              style={{
                color: s.colors.text,
                borderColor: s.colors.border,
                background: s.colors.bg,
              }}
            >
              <span className="h-4 w-4 flex items-center justify-center shrink-0">{s.icon}</span>
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
