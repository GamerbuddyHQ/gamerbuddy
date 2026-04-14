import { useState, useEffect, useRef } from "react";
import { Clock, ChevronDown, X, Pin, PinOff } from "lucide-react";

/* ── Region catalogue ─────────────────────────────────────── */
export const CLOCK_REGIONS: { id: string; label: string; shortLabel: string; flag: string; tz: string }[] = [
  { id: "local",    label: "My Local Time", shortLabel: "Local",    flag: "🌐", tz: "" },
  { id: "india",    label: "India",         shortLabel: "India",    flag: "🇮🇳", tz: "Asia/Kolkata"        },
  { id: "usa_east", label: "USA East",      shortLabel: "USA E",    flag: "🇺🇸", tz: "America/New_York"    },
  { id: "usa_west", label: "USA West",      shortLabel: "USA W",    flag: "🇺🇸", tz: "America/Los_Angeles" },
  { id: "europe",   label: "Europe",        shortLabel: "Europe",   flag: "🇪🇺", tz: "Europe/Berlin"       },
  { id: "uk",       label: "UK",            shortLabel: "UK",       flag: "🇬🇧", tz: "Europe/London"       },
  { id: "japan",    label: "Japan",         shortLabel: "Japan",    flag: "🇯🇵", tz: "Asia/Tokyo"          },
  { id: "korea",    label: "South Korea",   shortLabel: "Korea",    flag: "🇰🇷", tz: "Asia/Seoul"          },
  { id: "brazil",   label: "Brazil",        shortLabel: "Brazil",   flag: "🇧🇷", tz: "America/Sao_Paulo"   },
  { id: "australia",label: "Australia",     shortLabel: "Aus",      flag: "🇦🇺", tz: "Australia/Sydney"    },
];

const LS_KEY = "gb_clock_primary";

/* ── Helpers ──────────────────────────────────────────────── */
function tzAbbr(tz: string, date: Date): string {
  return (
    new Intl.DateTimeFormat("en", { timeZoneName: "short", timeZone: tz || undefined })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value ?? ""
  );
}

function formatTime(tz: string, date: Date): string {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz || undefined,
  }).format(date);
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const ms = 60000 - (Date.now() % 60000);
    const first = setTimeout(() => {
      tick();
      const interval = setInterval(tick, 60000);
      return () => clearInterval(interval);
    }, ms);
    return () => clearTimeout(first);
  }, []);
  return now;
}

function readPrimary(): string {
  try { return localStorage.getItem(LS_KEY) ?? "local"; } catch { return "local"; }
}
function writePrimary(id: string) {
  try { localStorage.setItem(LS_KEY, id); } catch {}
}

/* ── Component ────────────────────────────────────────────── */
export function RegionalClock() {
  const now = useNow();
  const [open, setOpen]       = useState(false);
  const [primaryId, setPrimaryId] = useState<string>(readPrimary);
  const ref = useRef<HTMLDivElement>(null);

  /* Local timezone */
  const localTz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime = formatTime(localTz, now);
  const localAbbr = tzAbbr(localTz, now);

  /* Primary region */
  const primaryRegion = CLOCK_REGIONS.find((r) => r.id === primaryId) ?? CLOCK_REGIONS[0];
  const primaryTz     = primaryRegion.tz || localTz;
  const primaryTime   = formatTime(primaryTz, now);
  const primaryAbbr   = tzAbbr(primaryTz, now);
  const primaryIsLocal = primaryId === "local" || primaryTz === localTz || primaryAbbr === localAbbr;

  function selectPrimary(id: string) {
    setPrimaryId(id);
    writePrimary(id);
  }

  /* Close on outside click */
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

      {/* ── Navbar pill ──────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Show world clock"
        title="Helps you coordinate session times across different regions."
        className={`
          h-9 flex items-center gap-1.5 px-2.5 rounded-xl border transition-all duration-200
          bg-background/60 hover:bg-primary/10 active:scale-95 select-none
          ${open
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-border/60 hover:border-primary/50 text-foreground/70"
          }
        `}
      >
        {/* Flag of primary region */}
        <span className="text-[14px] leading-none shrink-0">{primaryRegion.flag}</span>

        {/* Primary time (hidden on very small screens) */}
        <span className="text-[12px] font-black tabular-nums leading-none hidden sm:inline" style={{ letterSpacing: "-0.02em" }}>
          {primaryTime}
        </span>

        {/* Abbr label */}
        <span className="text-[10px] font-semibold opacity-55 leading-none hidden sm:inline">
          {primaryAbbr}
        </span>

        {/* Local time secondary — only when primary ≠ local */}
        {!primaryIsLocal && (
          <span className="text-[9px] font-medium opacity-40 leading-none hidden lg:inline border-l border-border/40 pl-1.5 ml-0.5">
            {localTime}
          </span>
        )}

        <ChevronDown
          className={`h-3 w-3 shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown panel ───────────────────────────────── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[260px] rounded-2xl border border-border/70 bg-popover overflow-hidden z-[200]"
          style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(168,85,247,0.10)" }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-primary/5">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-black uppercase tracking-widest text-primary">
                World Clock
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-5 w-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* ── Primary region hero ── */}
          <div className="px-3.5 pt-3 pb-2.5 border-b border-border/40 bg-primary/[0.04]">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/55 mb-1.5 flex items-center gap-1">
              <Pin className="h-2.5 w-2.5" /> Primary Region
            </p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[20px] leading-none shrink-0">{primaryRegion.flag}</span>
                <div className="min-w-0">
                  <div
                    className="text-[24px] font-black tabular-nums leading-none"
                    style={{ color: "hsl(var(--primary))", letterSpacing: "-0.03em" }}
                  >
                    {primaryTime}
                  </div>
                  <div className="text-[10px] text-primary/60 font-bold mt-0.5 truncate">
                    {primaryRegion.label} · {primaryAbbr}
                  </div>
                </div>
              </div>
              {/* Local time — shown only when primary ≠ local */}
              {!primaryIsLocal && (
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-black tabular-nums text-foreground/60" style={{ letterSpacing: "-0.02em" }}>
                    {localTime}
                  </div>
                  <div className="text-[9px] text-muted-foreground font-medium">Your time</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Region list — tap to set primary ── */}
          <div className="py-1">
            <p className="px-3.5 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
              Tap a region to pin it
            </p>
            {CLOCK_REGIONS.map((r, i) => {
              const tz      = r.tz || localTz;
              const time    = formatTime(tz, now);
              const abbr    = tzAbbr(tz, now);
              const isActive = r.id === primaryId;
              const isSameAsLocal = r.tz && (r.tz === localTz || abbr === localAbbr);

              return (
                <button
                  key={r.id}
                  onClick={() => selectPrimary(r.id)}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2 transition-all duration-150 text-left
                    ${i < CLOCK_REGIONS.length - 1 ? "border-b border-border/10" : ""}
                    ${isActive
                      ? "bg-primary/10"
                      : "hover:bg-muted/40"
                    }
                    ${isSameAsLocal && !isActive ? "opacity-45" : ""}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] leading-none shrink-0">{r.flag}</span>
                    <span className={`text-[12px] font-semibold truncate ${isActive ? "text-primary" : "text-foreground/75"}`}>
                      {r.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <span
                        className={`text-[13px] font-black tabular-nums leading-none ${isActive ? "text-primary" : "text-foreground"}`}
                        style={{ letterSpacing: "-0.02em" }}
                      >
                        {time}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground ml-1">{abbr}</span>
                    </div>
                    {isActive ? (
                      <Pin className="h-3 w-3 text-primary fill-primary shrink-0" />
                    ) : (
                      <PinOff className="h-3 w-3 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Footer ── */}
          <div className="px-3.5 py-2 border-t border-border/40 bg-muted/20 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="text-[9px] text-muted-foreground font-medium">Live · updates every minute</span>
          </div>
        </div>
      )}
    </div>
  );
}
