import { useState, useEffect, useRef } from "react";
import { Clock, ChevronDown, X } from "lucide-react";

const REGIONS: { label: string; flag: string; tz: string }[] = [
  { label: "India",    flag: "🇮🇳", tz: "Asia/Kolkata"       },
  { label: "USA East", flag: "🇺🇸", tz: "America/New_York"   },
  { label: "USA West", flag: "🇺🇸", tz: "America/Los_Angeles" },
  { label: "Europe",   flag: "🇪🇺", tz: "Europe/Berlin"      },
  { label: "Japan",    flag: "🇯🇵", tz: "Asia/Tokyo"         },
  { label: "Korea",    flag: "🇰🇷", tz: "Asia/Seoul"         },
];

function tzAbbr(tz: string, date: Date): string {
  return (
    new Intl.DateTimeFormat("en", { timeZoneName: "short", timeZone: tz })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

function formatTime(tz: string, date: Date): string {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(date);
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const ms = 60000 - (Date.now() % 60000);
    const first = setTimeout(() => { tick(); setInterval(tick, 60000); }, ms);
    return () => clearTimeout(first);
  }, []);
  return now;
}

export function RegionalClock() {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const localTz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime = formatTime(localTz, now);
  const localAbbr = tzAbbr(localTz, now);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* ── Compact navbar button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Show world clock"
        className={`
          h-9 flex items-center gap-1.5 px-2.5 rounded-xl border transition-all duration-200
          bg-background/60 hover:bg-primary/10 active:scale-95
          ${open
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-border/60 hover:border-primary/50 text-foreground/70"
          }
        `}
      >
        <Clock className={`h-3.5 w-3.5 shrink-0 transition-colors ${open ? "text-primary" : "text-primary/70"}`} />
        <span className="text-[12px] font-bold tabular-nums leading-none hidden sm:inline">
          {localTime}
        </span>
        <span className="text-[10px] font-semibold opacity-60 leading-none hidden sm:inline">
          {localAbbr}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[230px] rounded-2xl border border-border/70 bg-popover shadow-xl overflow-hidden z-[200]"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(168,85,247,0.08)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-primary/5">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                World Time
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-5 w-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Your time — highlighted */}
          <div className="px-3.5 py-3 border-b border-border/40 bg-primary/[0.04]">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-1">
              Your Local Time
            </p>
            <div className="flex items-baseline justify-between">
              <span
                className="text-[22px] font-black tabular-nums leading-none"
                style={{ color: "hsl(var(--primary))", letterSpacing: "-0.03em" }}
              >
                {localTime}
              </span>
              <span className="text-[11px] font-bold text-primary/70 ml-2">{localAbbr}</span>
            </div>
          </div>

          {/* Region rows */}
          <div className="py-1.5">
            {REGIONS.map((r, i) => {
              const time = formatTime(r.tz, now);
              const abbr = tzAbbr(r.tz, now);
              const isLocal = r.tz === localTz || abbr === localAbbr;
              return (
                <div
                  key={r.tz}
                  className={`
                    flex items-center justify-between px-3.5 py-2 transition-colors hover:bg-muted/50
                    ${i < REGIONS.length - 1 ? "border-b border-border/20" : ""}
                    ${isLocal ? "opacity-40" : ""}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] leading-none shrink-0">{r.flag}</span>
                    <span className="text-[12px] font-semibold text-foreground/80 truncate">{r.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 shrink-0 ml-2">
                    <span className="text-[14px] font-black tabular-nums text-foreground leading-none" style={{ letterSpacing: "-0.02em" }}>
                      {time}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground">{abbr}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-3.5 py-2 border-t border-border/40 bg-muted/30 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-[9px] text-muted-foreground font-medium">Live · updates every minute</span>
          </div>
        </div>
      )}
    </div>
  );
}
