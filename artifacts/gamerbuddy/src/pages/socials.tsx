import React from "react";
import { useTheme } from "@/lib/theme";

const SUPERR_URL  = "https://www.superr.bio/gamerbuddy";
const DISCORD_URL = "https://discord.gg/pJcmECke";

const OTHER_PLATFORMS = [
  { label: "YouTube",   url: "https://www.youtube.com/@GamerbuddyHQ" },
  { label: "X",         url: "https://x.com/GamerbuddyHQ"            },
  { label: "Instagram", url: "https://instagram.com/gamerbuddy"      },
  { label: "GameJolt",  url: "https://gamejolt.com/@Gamerbuddy"      },
  { label: "Facebook",  url: "https://facebook.com/gamerbuddy"       },
];

export default function SocialsPage() {
  const { isDark } = useTheme();

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center py-16 px-4"
      style={{
        background: isDark
          ? "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(168,85,247,0.07) 0%, transparent 70%)"
          : "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,58,237,0.05) 0%, transparent 70%)",
      }}
    >
      <div className="w-full max-w-xl mx-auto text-center space-y-10">

        {/* ── Badge ── */}
        <div className="flex justify-center">
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
        </div>

        {/* ── Heading ── */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-tight">
            Stay{" "}
            <span style={{ color: isDark ? "#a855f7" : "hsl(272,72%,42%)" }}>
              Connected
            </span>{" "}
            with Gamerbuddy
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Follow us on all platforms for updates, tournaments, giveaways, and epic gaming moments!
          </p>
        </div>

        {/* ── Main CTA: All Socials & Links (Superr.bio) ── */}
        <div className="space-y-3">
          <a
            href={SUPERR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative w-full flex items-center justify-center gap-3 rounded-2xl px-8 py-5 font-black text-lg text-white transition-all duration-300 hover:scale-[1.03] hover:brightness-110 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #22d3ee 100%)",
              boxShadow: "0 0 50px rgba(168,85,247,0.50), 0 6px 30px rgba(34,211,238,0.25), inset 0 1px 0 rgba(255,255,255,0.20)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-6 w-6 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            All Socials &amp; Links
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
              className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <p className="text-xs text-muted-foreground/50 font-medium">
            One link — every platform, every update, all in one place
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "rgba(168,85,247,0.12)" }} />
          <span className="text-[10px] text-muted-foreground/35 uppercase tracking-[0.2em] font-black">also on</span>
          <div className="flex-1 h-px" style={{ background: "rgba(168,85,247,0.12)" }} />
        </div>

        {/* ── Discord CTA ── */}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group w-full flex items-center justify-center gap-3 rounded-2xl px-8 py-4 font-black text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.97]"
          style={{
            background: isDark ? "rgba(88,101,242,0.12)" : "rgba(88,101,242,0.08)",
            border: "1.5px solid rgba(88,101,242,0.35)",
            color: "#7289da",
            boxShadow: "0 0 24px rgba(88,101,242,0.15)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(88,101,242,0.65)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 36px rgba(88,101,242,0.30)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(88,101,242,0.35)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(88,101,242,0.15)";
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 shrink-0">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.032.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Join Our Discord Server
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
            className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </a>

        {/* ── Other platforms — minimal text links ── */}
        <div className="pt-2 space-y-2">
          <p className="text-[11px] text-muted-foreground/35 uppercase tracking-[0.18em] font-black">
            Also find us on
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {OTHER_PLATFORMS.map((p) => (
              <a
                key={p.label}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors duration-150 font-medium"
              >
                {p.label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
