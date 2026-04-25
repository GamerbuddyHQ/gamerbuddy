const PX = 4;

const ALIEN: number[][] = [
  [0,0,1,0,0,0,0,0,1,0,0],
  [0,0,0,1,0,0,0,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,0,0],
  [0,1,1,0,1,1,1,0,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1],
  [0,0,0,1,1,0,1,1,0,0,0],
];

const HERO: number[][] = [
  [0,1,1,0,0,0],
  [1,1,1,1,0,0],
  [1,1,1,1,0,0],
  [0,1,1,0,0,0],
  [1,1,1,1,1,0],
  [1,0,1,0,1,0],
  [1,0,0,0,1,0],
  [1,0,0,0,1,0],
];

function PixelSprite({ grid, color }: { grid: number[][], color: string }) {
  const rows = grid.length;
  const cols = grid[0].length;
  return (
    <svg
      width={cols * PX}
      height={rows * PX}
      viewBox={`0 0 ${cols * PX} ${rows * PX}`}
      style={{ display: "block", imageRendering: "pixelated" }}
    >
      {grid.flatMap((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * PX}
              y={r * PX}
              width={PX}
              height={PX}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function HeroEasterEgg() {
  return (
    <>
      <style>{`
        @keyframes hero-chase {
          from { transform: translateX(calc(100vw + 200px)); }
          to   { transform: translateX(-260px); }
        }
        @keyframes laser-blink {
          0%, 100% { opacity: 1; scaleX: 1; }
          45%      { opacity: 0.15; }
          50%      { opacity: 0.9; }
        }
        @keyframes alien-wobble {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-3px); }
        }
        @keyframes hero-bounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-2px); }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "54%",
          pointerEvents: "none",
          zIndex: 1,
          opacity: 0.62,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "flex-end",
            gap: 10,
            animation: "hero-chase 24s linear -8s infinite",
          }}
        >
          <div style={{ animation: "hero-bounce 0.55s ease-in-out infinite" }}>
            <PixelSprite grid={HERO} color="#E2E8F0" />
          </div>

          <div
            style={{
              width: 28,
              height: 2,
              borderRadius: 1,
              background: "linear-gradient(90deg, rgba(212,255,0,0.9) 0%, rgba(212,255,0,0.2) 100%)",
              marginBottom: 11,
              animation: "laser-blink 0.18s linear infinite",
            }}
          />

          <div style={{ animation: "alien-wobble 0.7s ease-in-out infinite" }}>
            <PixelSprite grid={ALIEN} color="#D4FF00" />
          </div>
        </div>
      </div>
    </>
  );
}
