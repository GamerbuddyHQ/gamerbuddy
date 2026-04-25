import { useEffect, useRef } from "react";

type IconType = "controller" | "coin" | "star" | "joystick";
type EasingType = "easeIn" | "easeOut" | "bounce";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  icon: IconType;
  color: string;
  baseAlpha: number;
  delay: number;
  easing: EasingType;
  oscPhaseX: number; oscPhaseY: number;
  oscSpeedX: number; oscSpeedY: number;
  oscAmpX: number; oscAmpY: number;
  pulsePhase: number; pulseSpeed: number;
  rotation: number; rotSpeed: number;
  born: boolean;
}

const ICONS: IconType[] = ["controller", "coin", "star", "joystick"];
const EASINGS: EasingType[] = ["easeIn", "easeOut", "bounce"];

const PURPLE_COLORS = [
  "#7C3AED", "#8B5CF6", "#9333EA", "#A855F7",
  "#B15EED", "#6D28D9", "#7E22CE", "#C084FC",
];

function easeIn(t: number) { return t * t * t; }
function easeOut(t: number) { const u = 1 - t; return 1 - u * u * u; }
function bounce(t: number) {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}
function applyEasing(type: EasingType, t: number) {
  t = Math.max(0, Math.min(1, t));
  if (type === "easeIn") return easeIn(t);
  if (type === "easeOut") return easeOut(t);
  return bounce(t);
}

function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function makeStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const spikes = 5, inner = r * 0.42;
  const step = Math.PI / spikes;
  let a = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); a += step;
    ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner); a += step;
  }
  ctx.closePath();
  ctx.fill();
}

function makeController(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const w = r * 2.4, h = r * 1.5, rx = h * 0.38;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, rx);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx - w / 2 - r * 0.35, cy + h * 0.05, r * 0.72, h * 0.65, r * 0.36);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + w / 2 - r * 0.37, cy + h * 0.05, r * 0.72, h * 0.65, r * 0.36);
  ctx.fill();
}

function makeCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.globalAlpha *= 0.28;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function makeJoystick(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.65, r * 0.95, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx - r * 0.2, cy - r * 0.5, r * 0.4, r * 1.15, r * 0.2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.5, r * 0.42, 0, Math.PI * 2); ctx.fill();
}

function drawIcon(ctx: CanvasRenderingContext2D, icon: IconType, x: number, y: number, size: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  switch (icon) {
    case "star":       makeStar(ctx, 0, 0, size); break;
    case "controller": makeController(ctx, 0, 0, size); break;
    case "coin":       makeCoin(ctx, 0, 0, size); break;
    case "joystick":   makeJoystick(ctx, 0, 0, size); break;
  }
  ctx.restore();
}

function spawnParticle(w: number, h: number): Particle {
  const size = rand(3.5, 9.5);
  const speed = rand(0.04, 0.28);
  const angle = rand(0, Math.PI * 2);
  return {
    x: rand(0, w), y: rand(0, h),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    icon: pick(ICONS),
    color: pick(PURPLE_COLORS),
    baseAlpha: rand(0.45, 0.85),
    delay: rand(0, 3000),
    easing: pick(EASINGS),
    oscPhaseX: rand(0, Math.PI * 2),
    oscPhaseY: rand(0, Math.PI * 2),
    oscSpeedX: rand(0.0003, 0.0012),
    oscSpeedY: rand(0.0003, 0.0012),
    oscAmpX: rand(6, 28),
    oscAmpY: rand(6, 28),
    pulsePhase: rand(0, Math.PI * 2),
    pulseSpeed: rand(0.0004, 0.0018),
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.006, 0.006),
    born: false,
  };
}

const PARTICLE_COUNT = 500;
const BIRTH_DURATION = 1400;

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
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (ctx) ctx.scale(dpr, dpr);
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

        let birthAlpha = 1;
        if (age < BIRTH_DURATION) {
          birthAlpha = applyEasing(p.easing, age / BIRTH_DURATION);
          p.born = false;
        } else {
          p.born = true;
        }

        const pulseAlpha = 0.55 + 0.45 * Math.sin(p.pulsePhase + elapsed * p.pulseSpeed);

        const alpha = p.baseAlpha * birthAlpha * pulseAlpha;

        const drawX = p.x + p.oscAmpX * Math.sin(p.oscPhaseX + elapsed * p.oscSpeedX);
        const drawY = p.y + p.oscAmpY * Math.sin(p.oscPhaseY + elapsed * p.oscSpeedY);

        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        if (p.x < -30) p.x = W + 30;
        else if (p.x > W + 30) p.x = -30;
        if (p.y < -30) p.y = H + 30;
        else if (p.y > H + 30) p.y = -30;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.size * 3.5;
        ctx.shadowColor = p.color;
        drawIcon(ctx, p.icon, drawX, drawY, p.size, p.rotation);
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
