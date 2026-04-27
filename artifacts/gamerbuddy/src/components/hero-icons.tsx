import { Gamepad2, Monitor, Smartphone, Crosshair, Keyboard, Mouse, Headphones } from "lucide-react";

/* ── Custom SVG icons not in lucide ─────────────────────────── */
const NintendoSwitch = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="4" width="6.5" height="16" rx="3.5" />
    <rect x="8.5" y="7.5" width="7" height="9" rx="1" />
    <rect x="16" y="4" width="6.5" height="16" rx="3.5" />
    <circle cx="4.75" cy="8.5" r="1" fill={color} stroke="none" />
    <line x1="3.5" y1="12.5" x2="6" y2="12.5" />
    <line x1="4.75" y1="11.25" x2="4.75" y2="13.75" />
    <circle cx="19.25" cy="15.5" r="1" fill={color} stroke="none" />
  </svg>
);

const PSController = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.5 9.5c0-2 1.5-3.5 3-3.5h11c1.5 0 3 1.5 3 3.5v4.5l-1.5 3.5H5l-1.5-3.5V9.5z" />
    <path d="M5 14l-2.5 5" />
    <path d="M19 14l2.5 5" />
    <circle cx="8.5" cy="13" r="2" />
    <circle cx="14.5" cy="10" r="2" />
    <circle cx="17.5" cy="13" r="0.8" fill={color} stroke="none" />
    <circle cx="16" cy="10.5" r="0.8" fill={color} stroke="none" />
  </svg>
);

const XboxController = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10c0-2 1.5-4 3-4h10c1.5 0 3 2 3 4v4.5l-2 4H6l-2-4V10z" />
    <path d="M6 14.5L4 20" />
    <path d="M18 14.5L20 20" />
    <circle cx="9" cy="13.5" r="2" />
    <circle cx="15" cy="10" r="2" />
    <circle cx="17" cy="13" r="0.75" fill={color} stroke="none" />
    <circle cx="17" cy="11" r="0.75" fill={color} stroke="none" />
    <circle cx="16" cy="12" r="0.75" fill={color} stroke="none" />
    <circle cx="18" cy="12" r="0.75" fill={color} stroke="none" />
  </svg>
);

const JoystickSVG = ({ size, color }: { size: number; color: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="3.5" />
    <line x1="12" y1="10.5" x2="12" y2="17" />
    <ellipse cx="12" cy="19" rx="5.5" ry="2" />
    <line x1="9" y1="5.5" x2="6" y2="3.5" />
    <line x1="15" y1="5.5" x2="18" y2="3.5" />
  </svg>
);

/* ── Glow filters ────────────────────────────────────────────── */
const GLOW_GREEN = "drop-shadow(0 0 7px #D4FF0070) drop-shadow(0 0 14px #D4FF0030)";
const GLOW_WHITE = "drop-shadow(0 0 6px rgba(212,255,0,0.25)) drop-shadow(0 0 3px rgba(255,255,255,0.30))";

/* ── Icon layout definition ──────────────────────────────────── */
const GREEN = "#D4FF00";
const WHITE = "#ffffff";

type Variant = 1 | 2 | 3;

interface IconEntry {
  el: React.ReactNode;
  left: number;
  top: number;
  opacity: number;
  variant: Variant;
  dur: number;
  delay: number;
  glow: string;
}

const ICONS: IconEntry[] = [
  { el: <Gamepad2       size={28} color={GREEN} />, left:  7, top:  9, opacity: 0.55, variant: 1, dur: 14, delay:  0, glow: GLOW_GREEN },
  { el: <NintendoSwitch size={26} color={WHITE} />, left: 88, top: 13, opacity: 0.42, variant: 2, dur: 18, delay:  2, glow: GLOW_WHITE },
  { el: <PSController   size={30} color={GREEN} />, left: 13, top: 68, opacity: 0.50, variant: 3, dur: 20, delay:  1, glow: GLOW_GREEN },
  { el: <XboxController size={26} color={WHITE} />, left: 80, top: 60, opacity: 0.40, variant: 1, dur: 17, delay:  4, glow: GLOW_WHITE },
  { el: <JoystickSVG   size={22} color={GREEN} />, left: 47, top:  5, opacity: 0.45, variant: 2, dur: 22, delay:  7, glow: GLOW_GREEN },
  { el: <Headphones    size={24} color={WHITE} />, left: 92, top: 40, opacity: 0.42, variant: 3, dur: 15, delay:  3, glow: GLOW_WHITE },
  { el: <Keyboard      size={26} color={WHITE} />, left: 22, top: 80, opacity: 0.38, variant: 1, dur: 21, delay:  5, glow: GLOW_WHITE },
  { el: <Mouse         size={22} color={GREEN} />, left: 68, top: 78, opacity: 0.48, variant: 2, dur: 13, delay:  6, glow: GLOW_GREEN },
  { el: <Smartphone    size={20} color={WHITE} />, left:  3, top: 45, opacity: 0.35, variant: 3, dur: 19, delay:  9, glow: GLOW_WHITE },
  { el: <Crosshair     size={24} color={GREEN} />, left: 60, top: 88, opacity: 0.45, variant: 1, dur: 24, delay:  2, glow: GLOW_GREEN },
  { el: <Monitor       size={22} color={WHITE} />, left: 33, top: 11, opacity: 0.36, variant: 2, dur: 16, delay: 10, glow: GLOW_WHITE },
  { el: <Gamepad2      size={20} color={GREEN} />, left: 75, top: 26, opacity: 0.38, variant: 3, dur: 26, delay: 12, glow: GLOW_GREEN },
  { el: <Headphones    size={18} color={WHITE} />, left: 17, top: 30, opacity: 0.32, variant: 1, dur: 23, delay: 14, glow: GLOW_WHITE },
  { el: <Crosshair     size={18} color={GREEN} />, left: 54, top: 53, opacity: 0.35, variant: 2, dur: 28, delay:  8, glow: GLOW_GREEN },
  { el: <Mouse         size={16} color={WHITE} />, left: 40, top: 38, opacity: 0.30, variant: 3, dur: 30, delay: 16, glow: GLOW_WHITE },
  { el: <NintendoSwitch size={22} color={GREEN} />, left:  5, top: 74, opacity: 0.40, variant: 2, dur: 25, delay: 11, glow: GLOW_GREEN },
];

export function HeroIcons() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {ICONS.map((item, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${item.left}%`,
            top: `${item.top}%`,
            opacity: item.opacity,
            filter: item.glow,
            animation: `float-icon-${item.variant} ${item.dur}s ease-in-out ${item.delay}s infinite`,
            willChange: "transform",
          }}
        >
          {item.el}
        </div>
      ))}
    </div>
  );
}
