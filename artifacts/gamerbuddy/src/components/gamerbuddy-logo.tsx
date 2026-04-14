import React from "react";

/**
 * Gamerbuddy icon — four platform arms converging on a globe node.
 * Purple (top/bottom = PC/PS) + cyan (left/right = Switch/Mobile).
 * Scales cleanly from 16 px favicon to 48 px+ hero use.
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
        {/* Dark interior */}
        <radialGradient id="gbBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#200d3a" />
          <stop offset="100%" stopColor="#0b0614" />
        </radialGradient>

        {/* Center node */}
        <radialGradient id="gbNode" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#e879f9" />
          <stop offset="70%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>

        {/* Outer ambient halo */}
        <radialGradient id="gbHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>

        {/* Ring gradient — purple → cyan → purple */}
        <linearGradient id="gbRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="40%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>

        {/* Cyan arm gradient */}
        <linearGradient id="gbArmC" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="gbArmCr" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>

        {/* Purple arm gradient */}
        <linearGradient id="gbArmPt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="gbArmPb" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>

        {/* Soft glow for center node */}
        <filter id="gbNodeGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle arm edge glow */}
        <filter id="gbArmGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Ambient halo (behind everything) ── */}
      <circle cx="16" cy="16" r="15" fill="url(#gbHalo)" />

      {/* ── Main disc ── */}
      <circle cx="16" cy="16" r="14.5" fill="url(#gbBg)" />

      {/* ── Ring border — thicker + more opaque ── */}
      <circle
        cx="16"
        cy="16"
        r="14.5"
        stroke="url(#gbRing)"
        strokeWidth="1.6"
        opacity="0.9"
      />

      {/* ── Globe wireframe (visible at 20 px+, decorative at smaller) ── */}
      {/* Equator */}
      <ellipse
        cx="16"
        cy="16"
        rx="8.5"
        ry="3"
        stroke="#22d3ee"
        strokeWidth="0.8"
        opacity="0.45"
      />
      {/* Vertical meridian */}
      <ellipse
        cx="16"
        cy="16"
        rx="3"
        ry="8.5"
        stroke="#22d3ee"
        strokeWidth="0.8"
        opacity="0.35"
      />

      {/* ── Four platform arms — wider paths, gradient fill ── */}

      {/* TOP arm (PC) — purple, tapers from tip to center */}
      <path
        d="M14.5 4.5 L16 3 L17.5 4.5 L17.5 13.5 L16 14.8 L14.5 13.5 Z"
        fill="url(#gbArmPt)"
        filter="url(#gbArmGlow)"
      />
      {/* Edge highlight stripe on top arm */}
      <line
        x1="16"
        y1="3.2"
        x2="16"
        y2="13"
        stroke="#c084fc"
        strokeWidth="0.6"
        opacity="0.6"
      />

      {/* BOTTOM arm (PS) — purple */}
      <path
        d="M14.5 27.5 L16 29 L17.5 27.5 L17.5 18.5 L16 17.2 L14.5 18.5 Z"
        fill="url(#gbArmPb)"
        filter="url(#gbArmGlow)"
      />
      <line
        x1="16"
        y1="28.8"
        x2="16"
        y2="19"
        stroke="#c084fc"
        strokeWidth="0.6"
        opacity="0.6"
      />

      {/* LEFT arm (Switch) — cyan */}
      <path
        d="M4.5 14.5 L3 16 L4.5 17.5 L13.5 17.5 L14.8 16 L13.5 14.5 Z"
        fill="url(#gbArmCr)"
        filter="url(#gbArmGlow)"
      />
      <line
        x1="3.2"
        y1="16"
        x2="13"
        y2="16"
        stroke="#67e8f9"
        strokeWidth="0.6"
        opacity="0.6"
      />

      {/* RIGHT arm (Mobile) — cyan */}
      <path
        d="M27.5 14.5 L29 16 L27.5 17.5 L18.5 17.5 L17.2 16 L18.5 14.5 Z"
        fill="url(#gbArmC)"
        filter="url(#gbArmGlow)"
      />
      <line
        x1="28.8"
        y1="16"
        x2="19"
        y2="16"
        stroke="#67e8f9"
        strokeWidth="0.6"
        opacity="0.6"
      />

      {/* ── Center glowing node ── */}
      <circle
        cx="16"
        cy="16"
        r="4"
        fill="url(#gbNode)"
        filter="url(#gbNodeGlow)"
      />
      {/* Bright inner dot */}
      <circle cx="16" cy="16" r="1.8" fill="white" opacity="0.98" />
    </svg>
  );
}

/**
 * Full Gamerbuddy wordmark: icon + "Gamer" (purple) "buddy" (cyan).
 * textSize controls the type scale. iconOnly hides the text.
 */
export function GamerbuddyLogo({
  iconSize = 26,
  textSize = "xl",
  iconOnly = false,
  className,
}: {
  iconSize?: number;
  textSize?: "sm" | "base" | "lg" | "xl" | "2xl";
  iconOnly?: boolean;
  className?: string;
}) {
  const sizeClass: Record<string, string> = {
    sm:   "text-sm",
    base: "text-base",
    lg:   "text-lg",
    xl:   "text-xl",
    "2xl":"text-2xl",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      aria-label="Gamerbuddy"
    >
      <GamerbuddyIcon size={iconSize} />
      {!iconOnly && (
        <span
          className={`font-extrabold leading-none select-none ${sizeClass[textSize] ?? "text-xl"}`}
          style={{ letterSpacing: "0.01em" }}
        >
          <span style={{ color: "#c084fc" }}>Gamer</span>
          <span style={{ color: "#22d3ee" }}>buddy</span>
        </span>
      )}
    </span>
  );
}
