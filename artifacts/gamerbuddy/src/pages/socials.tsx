import React from "react";
import { useTheme } from "@/lib/theme";

/* ── Platform brand data ─────────────────────────────────────────────────── */
const SOCIALS = [
  {
    id: "youtube",
    label: "YouTube",
    handle: "@gamerbuddy",
    url: "https://youtube.com/@gamerbuddy",
    description: "Watch streams, highlights, tournament replays & gaming tips.",
    colors: {
      bg: "rgba(255,0,0,0.08)",
      border: "rgba(255,0,0,0.28)",
      glow: "rgba(255,0,0,0.18)",
      text: "#ff4444",
      btn: "linear-gradient(135deg,#ff0000,#cc0000)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X (Twitter)",
    handle: "@gamerbuddy",
    url: "https://x.com/gamerbuddy",
    description: "Live updates, announcements, giveaways & gaming hot takes.",
    colors: {
      bg: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.20)",
      glow: "rgba(255,255,255,0.10)",
      text: "#e5e7eb",
      btn: "linear-gradient(135deg,#1a1a1a,#333333)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    handle: "@gamerbuddy",
    url: "https://instagram.com/gamerbuddy",
    description: "Epic screenshots, community highlights & behind-the-scenes.",
    colors: {
      bg: "rgba(225,48,108,0.08)",
      border: "rgba(225,48,108,0.28)",
      glow: "rgba(225,48,108,0.18)",
      text: "#e1306c",
      btn: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
      </svg>
    ),
  },
  {
    id: "gamejolt",
    label: "GameJolt",
    handle: "@gamerbuddy",
    url: "https://gamejolt.com/@gamerbuddy",
    description: "Game pages, dev logs, community stickers & achievements.",
    colors: {
      bg: "rgba(44,204,120,0.08)",
      border: "rgba(44,204,120,0.28)",
      glow: "rgba(44,204,120,0.18)",
      text: "#2ccc78",
      btn: "linear-gradient(135deg,#2ccc78,#24a862)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 8.25h-3v7.5h-4.5v-7.5h-3v-1.5h10.5v1.5z" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    handle: "gamerbuddy",
    url: "https://facebook.com/gamerbuddy",
    description: "Events, groups, community posts & platform announcements.",
    colors: {
      bg: "rgba(24,119,242,0.08)",
      border: "rgba(24,119,242,0.28)",
      glow: "rgba(24,119,242,0.18)",
      text: "#1877f2",
      btn: "linear-gradient(135deg,#1877f2,#0d5dbf)",
    },
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
];

/* ── Social Card ─────────────────────────────────────────────────────────── */
function SocialCard({ s }: { s: (typeof SOCIALS)[0] }) {
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-4 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: s.colors.bg,
        border: `1.5px solid ${s.colors.border}`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${s.colors.glow}`;
        (e.currentTarget as HTMLElement).style.borderColor = s.colors.text;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.borderColor = s.colors.border;
      }}
    >
      {/* Icon + name */}
      <div className="flex items-center gap-3">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{ background: s.colors.bg, border: `1px solid ${s.colors.border}`, color: s.colors.text }}
        >
          {s.icon}
        </div>
        <div>
          <div className="font-extrabold text-lg leading-tight" style={{ color: s.colors.text }}>
            {s.label}
          </div>
          <div className="text-xs text-muted-foreground font-mono">{s.handle}</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{s.description}</p>

      {/* CTA button */}
      <div
        className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold text-white transition-all duration-300 group-hover:opacity-90 group-hover:scale-[1.02]"
        style={{ background: s.colors.btn }}
      >
        Follow on {s.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </a>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SocialsPage() {
  const { isDark } = useTheme();

  return (
    <div className="container max-w-5xl py-10 md:py-16 space-y-12">

      {/* ── Hero heading ── */}
      <div className="text-center space-y-4">
        <div
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border"
          style={{
            background: "rgba(168,85,247,0.10)",
            border: "1px solid rgba(168,85,247,0.30)",
            color: "#a855f7",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Official Channels
        </div>

        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight leading-tight">
          Stay{" "}
          <span
            style={{
              color: isDark ? "#a855f7" : "hsl(272,72%,42%)",
            }}
          >
            Connected
          </span>{" "}
          with Gamerbuddy
        </h1>

        <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
          Follow us on all platforms for updates, tournaments, giveaways, and epic gaming moments!
        </p>
      </div>

      {/* ── Social cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SOCIALS.map((s) => (
          <SocialCard key={s.id} s={s} />
        ))}
      </div>

      {/* ── Bottom CTA strip ── */}
      <div
        className="rounded-2xl px-8 py-8 text-center space-y-3"
        style={{
          background: "linear-gradient(135deg,rgba(168,85,247,0.10),rgba(34,211,238,0.06))",
          border: "1px solid rgba(168,85,247,0.20)",
        }}
      >
        <p className="text-xl font-extrabold uppercase tracking-tight">
          Join the Gamerbuddy Squad 🎮
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Be the first to know about new features, exclusive tournaments, community events, and platform giveaways across all our channels.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-1">
          {SOCIALS.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all hover:scale-105"
              style={{
                color: s.colors.text,
                borderColor: s.colors.border,
                background: s.colors.bg,
              }}
            >
              <span className="h-3.5 w-3.5">{s.icon}</span>
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
