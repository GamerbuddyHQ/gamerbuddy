import { useEffect, useRef } from "react";

type EasingType = "easeIn" | "easeOut" | "linear";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  baseAlpha: number;
  delay: number;
  easing: EasingType;
  oscPhaseX: number; oscPhaseY: number;
  oscSpeedX: number; oscSpeedY: number;
  oscAmpX: number; oscAmpY: number;
  pulsePhase: number; pulseSpeed: number;
}

const EASINGS: EasingType[] = ["easeIn", "easeOut", "linear"];

const COLORS = [
  "#8B5CF6", "#9333EA", "#A855F7",
  "#7C3AED", "#B15EED", "#C084FC",
];

function easeIn(t: number) { return t * t; }
function easeOut(t: number) { return t * (2 - t); }
function applyEasing(type: EasingType, t: number) {
  t = Math.max(0, Math.min(1, t));
  if (type === "easeIn") return easeIn(t);
  if (type === "easeOut") return easeOut(t);
  return t;
}

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function spawnParticle(w: number, h: number): Particle {
  const angle = rand(0, Math.PI * 2);
  const speed = rand(0.006, 0.05);
  return {
    x: rand(0, w),
    y: rand(0, h),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: rand(1, 3),
    color: pick(COLORS),
    baseAlpha: rand(0.10, 0.28),
    delay: rand(0, 3000),
    easing: pick(EASINGS),
    oscPhaseX: rand(0, Math.PI * 2),
    oscPhaseY: rand(0, Math.PI * 2),
    oscSpeedX: rand(0.00008, 0.0004),
    oscSpeedY: rand(0.00008, 0.0004),
    oscAmpX: rand(3, 12),
    oscAmpY: rand(3, 12),
    pulsePhase: rand(0, Math.PI * 2),
    pulseSpeed: rand(0.0003, 0.001),
  };
}

const PARTICLE_COUNT = 150;
const BIRTH_DURATION = 2000;

export function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    const startTime = performance.now();
    let particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      if (particles.length === 0) {
        particles = Array.from({ length: PARTICLE_COUNT }, () => spawnParticle(w, h));
      }
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    function frame(now: number) {
      if (!canvas || !ctx) return;
      const elapsed = now - startTime;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;

      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        const age = elapsed - p.delay;
        if (age < 0) continue;

        const birthAlpha = age < BIRTH_DURATION
          ? applyEasing(p.easing, age / BIRTH_DURATION)
          : 1;

        const pulse = 0.5 + 0.5 * Math.sin(p.pulsePhase + elapsed * p.pulseSpeed);
        const alpha = p.baseAlpha * birthAlpha * (0.6 + 0.4 * pulse);

        const drawX = p.x + p.oscAmpX * Math.sin(p.oscPhaseX + elapsed * p.oscSpeedX);
        const drawY = p.y + p.oscAmpY * Math.sin(p.oscPhaseY + elapsed * p.oscSpeedY);

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = W + 10;
        else if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        else if (p.y > H + 10) p.y = -10;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.size * 4;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
