import React from "react";

/**
 * Gamerbuddy logo icon — four platform arms converging on a globe,
 * symbolizing cross-platform unity. Purple (PC/PS) + cyan (Switch/Mobile).
 */
export function GamerbuddyIcon({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="gbIconBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e0a3c" />
          <stop offset="100%" stopColor="#09050f" />
        </radialGradient>
        <radialGradient id="gbIconCenter" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="45%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="gbIconHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gbIconRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <filter id="gbIconGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="gbArmGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer halo glow */}
      <circle cx="16" cy="16" r="14" fill="url(#gbIconHalo)" />

      {/* Dark background disc */}
      <circle cx="16" cy="16" r="14.5" fill="url(#gbIconBg)" />

      {/* Gradient ring border */}
      <circle
        cx="16"
        cy="16"
        r="14.5"
        stroke="url(#gbIconRing)"
        strokeWidth="1.1"
        opacity="0.85"
      />

      {/* Globe — equator ellipse */}
      <ellipse
        cx="16"
        cy="16"
        rx="9"
        ry="3.2"
        stroke="#22d3ee"
        strokeWidth="0.75"
        opacity="0.50"
      />
      {/* Globe — vertical meridian ellipse */}
      <ellipse
        cx="16"
        cy="16"
        rx="3.2"
        ry="9"
        stroke="#22d3ee"
        strokeWidth="0.75"
        opacity="0.40"
      />
      {/* Globe — cross lines */}
      <line
        x1="7"
        y1="16"
        x2="25"
        y2="16"
        stroke="#22d3ee"
        strokeWidth="0.5"
        opacity="0.20"
      />
      <line
        x1="16"
        y1="7"
        x2="16"
        y2="25"
        stroke="#22d3ee"
        strokeWidth="0.5"
        opacity="0.20"
      />

      {/* ── Four platform arms ── */}
      {/* TOP arm — PC keyboard (purple) */}
      <path
        d="M15 5 L16 4 L17 5 L17 13 L16 14.2 L15 13 Z"
        fill="#a855f7"
        opacity="0.92"
        filter="url(#gbArmGlow)"
      />
      {/* BOTTOM arm — PlayStation controller (purple) */}
      <path
        d="M15 27 L16 28 L17 27 L17 19 L16 17.8 L15 19 Z"
        fill="#a855f7"
        opacity="0.92"
        filter="url(#gbArmGlow)"
      />
      {/* LEFT arm — Nintendo Switch (cyan) */}
      <path
        d="M5 15 L4 16 L5 17 L13 17 L14.2 16 L13 15 Z"
        fill="#22d3ee"
        opacity="0.92"
        filter="url(#gbArmGlow)"
      />
      {/* RIGHT arm — Mobile phone (cyan) */}
      <path
        d="M27 15 L28 16 L27 17 L19 17 L17.8 16 L19 15 Z"
        fill="#22d3ee"
        opacity="0.92"
        filter="url(#gbArmGlow)"
      />

      {/* Center glowing node where all arms meet */}
      <circle
        cx="16"
        cy="16"
        r="3.8"
        fill="url(#gbIconCenter)"
        filter="url(#gbIconGlow)"
      />
      {/* Bright center dot */}
      <circle cx="16" cy="16" r="1.6" fill="white" opacity="0.96" />
    </svg>
  );
}

/**
 * Full Gamerbuddy wordmark: icon + "Gamer" (purple) + "buddy" (cyan).
 * Use `iconOnly` on very small viewports.
 */
export function GamerbuddyLogo({
  iconSize = 26,
  textSize = "xl",
  iconOnly = false,
  className,
}: {
  iconSize?: number;
  textSize?: "lg" | "xl" | "2xl";
  iconOnly?: boolean;
  className?: string;
}) {
  const sizeClass =
    textSize === "2xl"
      ? "text-2xl"
      : textSize === "lg"
      ? "text-lg"
      : "text-xl";

  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      aria-label="Gamerbuddy"
    >
      <GamerbuddyIcon size={iconSize} />
      {!iconOnly && (
        <span
          className={`font-extrabold tracking-tight uppercase leading-none ${sizeClass}`}
          style={{ letterSpacing: "-0.01em" }}
        >
          <span style={{ color: "#a855f7" }}>Gamer</span>
          <span style={{ color: "#22d3ee" }}>buddy</span>
        </span>
      )}
    </span>
  );
}
