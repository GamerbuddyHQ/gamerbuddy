import React from "react";

/**
 * Player4Hire icon — P4H monogram in yellow (#DCCE40) on a deep purple disc.
 * Amethyst Dawn Haze palette: #341C87 bg, #DCCE40 accent.
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
        <radialGradient id="p4hBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a1670" />
          <stop offset="100%" stopColor="#1a0d4a" />
        </radialGradient>

        <radialGradient id="p4hHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#DCCE40" stopOpacity="0.28" />
          <stop offset="65%" stopColor="#DCCE40" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#DCCE40" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="p4hRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DCCE40" stopOpacity="0.50" />
          <stop offset="50%" stopColor="#DCCE40" />
          <stop offset="100%" stopColor="#C4AEF4" stopOpacity="0.60" />
        </linearGradient>

        <filter id="p4hGlow" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient halo */}
      <circle cx="16" cy="16" r="15.5" fill="url(#p4hHalo)" />

      {/* Main disc */}
      <circle cx="16" cy="16" r="14.5" fill="url(#p4hBg)" />

      {/* Yellow → light-purple ring border */}
      <circle
        cx="16"
        cy="16"
        r="14.5"
        stroke="url(#p4hRing)"
        strokeWidth="1.2"
        opacity="0.9"
      />

      {/* P4H monogram */}
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fontFamily="'Arial Black','Impact','Helvetica Neue',Arial,sans-serif"
        fontSize="10"
        fontWeight="900"
        letterSpacing="-0.5"
        fill="#DCCE40"
        filter="url(#p4hGlow)"
      >
        P4H
      </text>
    </svg>
  );
}

/**
 * Full Player4Hire wordmark: icon + "Player" (white) "4Hire" (yellow #DCCE40).
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
      aria-label="Player4Hire"
    >
      <GamerbuddyIcon size={iconSize} />
      {!iconOnly && (
        <span
          className={`font-extrabold leading-none select-none ${sizeClass[textSize] ?? "text-xl"}`}
          style={{ letterSpacing: "0.01em" }}
        >
          <span style={{ color: "#e2e8f0" }}>Player</span>
          <span style={{ color: "#DCCE40" }}>4Hire</span>
        </span>
      )}
    </span>
  );
}
