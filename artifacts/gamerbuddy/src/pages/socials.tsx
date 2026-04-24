import React from "react";
import { useTheme } from "@/lib/theme";

const SUPERR_URL = "https://www.superr.bio/gamerbuddy";


export default function SocialsPage() {
  const { isDark } = useTheme();

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center py-16 px-4"
      style={{
        background: isDark
          ? "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(220,206,64,0.07) 0%, transparent 70%)"
          : "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(220,206,64,0.05) 0%, transparent 70%)",
      }}
    >
      <div className="w-full max-w-xl mx-auto text-center space-y-10">

        {/* ── Badge ── */}
        <div className="flex justify-center">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full"
            style={{
              background: "rgba(220,206,64,0.12)",
              border: "1px solid rgba(220,206,64,0.35)",
              color: "#DCCE40",
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
            <span style={{ color: isDark ? "#DCCE40" : "hsl(272,72%,42%)" }}>
              Connected
            </span>{" "}
            with Player4Hire
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Everything Player4Hire — every platform, every update, all social links — in one central place.
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
              background: "linear-gradient(135deg, #DCCE40 0%, #b5a730 50%, #C4AEF4 100%)",
              boxShadow: "0 0 50px rgba(220,206,64,0.50), 0 6px 30px rgba(196,174,244,0.25), inset 0 1px 0 rgba(255,255,255,0.20)",
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


      </div>
    </div>
  );
}
