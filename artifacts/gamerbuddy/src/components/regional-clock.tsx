import { useState, useEffect, useRef } from "react";
import { Clock, ChevronDown, X, Pin } from "lucide-react";

/* ── Region catalogue ─────────────────────────────────────── */
export const CLOCK_REGIONS: {
  id: string; label: string; flag: string; tz: string;
}[] = [
  { id: "local",     label: "My Local Time", flag: "🌐", tz: ""                      },
  { id: "india",     label: "India",         flag: "🇮🇳", tz: "Asia/Kolkata"          },
  { id: "usa_east",  label: "USA East",      flag: "🇺🇸", tz: "America/New_York"      },
  { id: "usa_west",  label: "USA West",      flag: "🇺🇸", tz: "America/Los_Angeles"   },
  { id: "europe",    label: "Europe",        flag: "🇪🇺", tz: "Europe/Berlin"         },
  { id: "uk",        label: "UK",            flag: "🇬🇧", tz: "Europe/London"         },
  { id: "japan",     label: "Japan",         flag: "🇯🇵", tz: "Asia/Tokyo"            },
  { id: "korea",     label: "South Korea",   flag: "🇰🇷", tz: "Asia/Seoul"            },
  { id: "brazil",    label: "Brazil",        flag: "🇧🇷", tz: "America/Sao_Paulo"     },
  { id: "australia", label: "Australia",     flag: "🇦🇺", tz: "Australia/Sydney"      },
];

const LS_KEY = "gb_clock_primary";

/* ── Helpers ──────────────────────────────────────────────── */
function tzAbbr(tz: string, date: Date): string {
  return (
    new Intl.DateTimeFormat("en", {
      timeZoneName: "short",
      timeZone: tz || undefined,
    })
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

/* ── Accurate per-minute timer — syncs to the clock boundary ── */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());

    // Align to the next whole minute, then tick every 60 s
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      tick();
      intervalRef.current = setInterval(tick, 60000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return now;
}

function readPrimary(): string {
  try { return localStorage.getItem(LS_KEY) ?? "local"; } catch { return "local"; }
}
function savePrimary(id: string) {
  try { localStorage.setItem(LS_KEY, id); } catch {}
}

/* ── Component ────────────────────────────────────────────── */
export function RegionalClock() {
  const now = useNow();
  const [open, setOpen]         = useState(false);
  const [primaryId, setPrimaryId] = useState<string>(readPrimary);
  const ref = useRef<HTMLDivElement>(null);

  const localTz   = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime = formatTime(localTz, now);
  const localAbbr = tzAbbr(localTz, now);

  const primaryRegion  = CLOCK_REGIONS.find((r) => r.id === primaryId) ?? CLOCK_REGIONS[0];
  const primaryTz      = primaryRegion.tz || localTz;
  const primaryTime    = formatTime(primaryTz, now);
  const primaryAbbr    = tzAbbr(primaryTz, now);
  const primaryIsLocal = primaryId === "local" || primaryAbbr === localAbbr;

  function selectPrimary(id: string) {
    setPrimaryId(id);
    savePrimary(id);
  }

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">

      {/* ── Navbar pill ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Show world clock"
        title="Helps you coordinate session times across different regions."
        className={[
          "h-9 flex items-center gap-1.5 px-2.5 rounded-xl border",
          "transition-all duration-200 active:scale-95 select-none",
          open
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-border/60 bg-background/60 text-foreground/70 hover:border-primary/50 hover:bg-primary/[0.06]",
        ].join(" ")}
      >
        <span className="text-[15px] leading-none shrink-0">{primaryRegion.flag}</span>

        <span
          className="text-[13px] font-black tabular-nums leading-none hidden sm:inline"
          style={{ letterSpacing: "-0.025em" }}
        >
          {primaryTime}
        </span>

        <span className="text-[10px] font-semibold opacity-50 leading-none hidden sm:inline">
          {primaryAbbr}
        </span>

        {/* Secondary local time — only on large screens when primary ≠ local */}
        {!primaryIsLocal && (
          <span className="hidden lg:inline text-[9px] font-medium opacity-35 border-l border-border/50 pl-1.5 ml-0.5 tabular-nums">
            {localTime}
          </span>
        )}

        <ChevronDown
          className={[
            "h-3 w-3 shrink-0 opacity-50 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {/* ── Dropdown ─────────────────────────────────────────── */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[268px] rounded-2xl border border-border/70 bg-popover z-[200] overflow-hidden flex flex-col"
          style={{
            boxShadow: "0 16px 48px rgba(0,0,0,0.32), 0 0 0 1px rgba(168,85,247,0.12)",
            maxHeight: "min(520px, 85dvh)",
          }}
        >
          {/* Header — fixed */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-primary/5 shrink-0">
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

          {/* Primary hero — fixed */}
          <div className="px-4 pt-3.5 pb-3 border-b border-border/40 shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(168,85,247,0.02) 100%)" }}
          >
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/50 mb-2 flex items-center gap-1">
              <Pin className="h-2.5 w-2.5 fill-primary/40" /> Pinned Region
            </p>

            <div className="flex items-center justify-between gap-3">
              {/* Flag + time block */}
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="text-[32px] leading-none shrink-0 drop-shadow-sm"
                  style={{ filter: "drop-shadow(0 0 8px rgba(168,85,247,0.4))" }}
                >
                  {primaryRegion.flag}
                </span>
                <div className="min-w-0">
                  <div
                    className="font-black tabular-nums leading-none"
                    style={{
                      fontSize: "38px",
                      letterSpacing: "-0.04em",
                      color: "hsl(var(--primary))",
                      textShadow: "0 0 24px rgba(168,85,247,0.5)",
                    }}
                  >
                    {primaryTime}
                  </div>
                  <div className="text-[11px] text-primary/55 font-bold mt-1 truncate">
                    {primaryRegion.label} · {primaryAbbr}
                  </div>
                </div>
              </div>

              {/* Your local — only when different */}
              {!primaryIsLocal && (
                <div className="text-right shrink-0 border-l border-border/40 pl-3">
                  <div
                    className="text-[16px] font-black tabular-nums text-foreground/50"
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {localTime}
                  </div>
                  <div className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider mt-0.5">
                    Your time
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable region list */}
          <div className="overflow-y-auto overscroll-contain">
            <p className="px-3.5 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
              Tap a region to pin it
            </p>

            {CLOCK_REGIONS.map((r, i) => {
              const tz       = r.tz || localTz;
              const time     = formatTime(tz, now);
              const abbr     = tzAbbr(tz, now);
              const isActive = r.id === primaryId;
              const sameAsLocal = r.tz && abbr === localAbbr;

              return (
                <button
                  key={r.id}
                  onClick={() => selectPrimary(r.id)}
                  className={[
                    "w-full flex items-center justify-between px-3.5 py-2.5",
                    "transition-all duration-150 text-left active:scale-[0.98]",
                    i < CLOCK_REGIONS.length - 1 ? "border-b border-border/10" : "",
                    isActive ? "bg-primary/10" : "hover:bg-muted/35",
                    sameAsLocal && !isActive ? "opacity-40" : "",
                  ].join(" ")}
                  style={isActive ? { boxShadow: "inset 3px 0 0 hsl(var(--primary))" } : {}}
                >
                  {/* Left: flag + label */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[17px] leading-none shrink-0">{r.flag}</span>
                    <span className={[
                      "text-[12px] font-semibold truncate",
                      isActive ? "text-primary" : "text-foreground/75",
                    ].join(" ")}>
                      {r.label}
                    </span>
                  </div>

                  {/* Right: time + abbr + pin */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <span
                        className={[
                          "tabular-nums font-black leading-none",
                          isActive ? "text-primary" : "text-foreground/85",
                        ].join(" ")}
                        style={{ fontSize: "14px", letterSpacing: "-0.025em" }}
                      >
                        {time}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground/60 ml-1">
                        {abbr}
                      </span>
                    </div>
                    <div className={[
                      "h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isActive
                        ? "bg-primary/20 border border-primary/40"
                        : "bg-transparent border border-border/20",
                    ].join(" ")}>
                      {isActive && <Pin className="h-2.5 w-2.5 text-primary fill-primary" />}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Footer */}
            <div className="px-3.5 py-2 border-t border-border/30 bg-muted/10 flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="text-[9px] text-muted-foreground/60 font-medium">
                Live · synced to the minute
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
