"use client";

import { useEffect, useRef } from "react";

/**
 * Two confetti cannons firing inward from the edges. Hand-rolled on a canvas
 * rather than pulled from a library: it is ~60 lines, and the particle shapes
 * and palette need to match the template.
 */
export function Confetti({ active, colors }: { active: boolean; colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!active || firedRef.current) return;
    firedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    }

    const w = canvas.width;
    const h = canvas.height;

    type Particle = {
      x: number; y: number; vx: number; vy: number;
      rotation: number; rotationSpeed: number;
      width: number; height: number;
      color: string; innerColor: string | null;
      isCircle: boolean; gravity: number;
      life: number; maxLife: number;
    };

    const particles: Particle[] = [];

    [{ x: w * 0.05, y: h * 0.5 }, { x: w * 0.95, y: h * 0.5 }].forEach(({ x, y }, side) => {
      const direction = side === 0 ? 1 : -1;
      for (let i = 0; i < 45; i++) {
        const angle =
          side === 0
            ? -Math.PI * (0.2 + Math.random() * 0.7)
            : -Math.PI * (0.1 + Math.random() * 0.7);
        const speed = 6 + Math.random() * 10;
        const isCircle = Math.random() > 0.7;
        const colorIndex = Math.floor(Math.random() * colors.length);

        particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y,
          vx: Math.cos(angle) * speed * direction,
          vy: Math.sin(angle) * speed,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
          width: 8 + Math.random() * 12,
          height: isCircle ? 8 + Math.random() * 12 : 5 + Math.random() * 8,
          color: colors[colorIndex],
          innerColor: isCircle && colorIndex > 2 ? "#ff3a00" : null,
          isCircle,
          gravity: 0.25 + Math.random() * 0.15,
          life: 0,
          maxLife: 80 + Math.random() * 60,
        });
      }
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;

        const t = p.life / p.maxLife;
        if (p.life < p.maxLife) alive = true;

        ctx.save();
        // Fade in over the first tenth of life, out over the last third.
        ctx.globalAlpha = t < 0.1 ? t / 0.1 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.width / 2, p.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (p.isCircle && p.innerColor) {
          ctx.fillStyle = p.innerColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.width / 4, p.height / 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive) rafRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const timer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(draw);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, colors]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-40" aria-hidden="true" />;
}
