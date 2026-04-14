import { ExternalLink, Radio } from "lucide-react";
import { STREAMING_PLATFORM_META } from "@/lib/bids-api";
import type { StreamingAccount } from "@workspace/db";

/* ── Official platform SVG logos (Simple Icons, 24×24 viewBox) ── */
const PLATFORM_SVG: Record<string, React.ReactNode> = {
  twitch: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  kick: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M3.392 2h4.386v7.731L13.875 2H19l-7.135 9.29L19.847 22H14.46l-6.682-9.384V22H3.392V2z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
};

/* ── Platform display order ── */
const PLATFORM_ORDER = ["twitch", "youtube", "kick", "facebook", "tiktok"] as const;

interface Props {
  accounts: StreamingAccount[];
  className?: string;
  onConnect?: () => void;
}

export function StreamingAccountsDisplay({ accounts, className = "", onConnect }: Props) {
  const connectedMap = Object.fromEntries(accounts.map((a) => [a.platform, a.username]));
  const connectedCount = accounts.length;

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${className}`}
      style={{
        borderColor: "rgba(168,85,247,0.2)",
        background: "rgba(8,6,18,0.7)",
        boxShadow: connectedCount > 0
          ? "0 0 0 1px rgba(168,85,247,0.08), 0 4px 32px rgba(168,85,247,0.06)"
          : "none",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "rgba(168,85,247,0.05)",
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Pulsing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: "#a855f7" }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ background: "#a855f7" }}
            />
          </span>
          <span className="text-xs font-extrabold uppercase tracking-widest text-white/80">
            Streaming Profiles
          </span>
        </div>

        {connectedCount > 0 ? (
          <span
            className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#4ade80",
            }}
          >
            {connectedCount} / {PLATFORM_ORDER.length} connected
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/40 font-medium">
            No accounts linked
          </span>
        )}
      </div>

      {/* ── Platform grid ── */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PLATFORM_ORDER.map((platform) => {
            const meta = STREAMING_PLATFORM_META[platform];
            const username = connectedMap[platform];
            const isConnected = !!username;
            const url = isConnected
              ? meta.urlTemplate.replace("{username}", username)
              : undefined;

            if (isConnected) {
              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-200"
                  style={{
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      `0 0 18px ${meta.color}28, 0 0 6px ${meta.color}18`;
                    (e.currentTarget as HTMLElement).style.borderColor = meta.color + "60";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    (e.currentTarget as HTMLElement).style.borderColor = meta.border;
                  }}
                >
                  {/* Icon */}
                  <div
                    className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center p-2 transition-transform duration-200 group-hover:scale-110"
                    style={{
                      background: `${meta.color}1a`,
                      border: `1.5px solid ${meta.color}40`,
                      color: meta.color,
                    }}
                  >
                    {PLATFORM_SVG[platform] ?? (
                      <span className="text-lg">{meta.emoji}</span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10px] font-black uppercase tracking-widest leading-none mb-1.5"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </div>
                    <div className="text-sm font-black text-white truncate leading-none">
                      @{username}
                    </div>
                    <div
                      className="text-[10px] mt-1 font-medium opacity-0 group-hover:opacity-80 transition-opacity duration-150 truncate"
                      style={{ color: meta.color }}
                    >
                      Visit channel →
                    </div>
                  </div>

                  {/* External link icon */}
                  <ExternalLink
                    className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    style={{ color: meta.color }}
                  />
                </a>
              );
            }

            /* ── Unconnected platform — grayed out placeholder ── */
            return (
              <div
                key={platform}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 opacity-30"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center p-2"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1.5px dashed rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {PLATFORM_SVG[platform] ?? (
                    <span className="text-lg">{meta.emoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1.5 text-white/40">
                    {meta.label}
                  </div>
                  <div className="text-xs text-white/25 italic font-medium">
                    Not connected
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── CTA: prompt own-profile owner to connect ── */}
        {onConnect && connectedCount === 0 && (
          <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground/50 italic">
              Show hirers where to find you live
            </p>
            <button
              onClick={onConnect}
              className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
              style={{
                background: "rgba(168,85,247,0.12)",
                border: "1px solid rgba(168,85,247,0.3)",
                color: "#c084fc",
              }}
            >
              <Radio className="h-3 w-3" />
              Connect Accounts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
