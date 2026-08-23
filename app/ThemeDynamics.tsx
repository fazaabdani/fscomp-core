"use client";

import { useEffect, useRef } from "react";
import type { ThemePreference } from "@/lib/app-settings";

export function ThemeDynamics({ resolvedTheme }: { resolvedTheme: ThemePreference }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (!canvas || !glow) return;

    // Tema terang sengaja mematikan animasi partikel total (bukan mewarnai ulang) --
    // orang pindah ke tema terang biasanya justru cari tampilan lebih tenang, dan
    // partikel ini jalan terus lewat requestAnimationFrame selama halaman terbuka,
    // jadi mematikannya juga menghemat CPU, bukan cuma soal warna.
    if (resolvedTheme === "light") return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const activeCanvas = canvas;
    const activeContext = context;
    const activeGlow = glow;
    let width = 0;
    let height = 0;
    let frame = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
    };

    const particles: Particle[] = [];

    function resize() {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      activeCanvas.width = width * pixelRatio;
      activeCanvas.height = height * pixelRatio;
      activeCanvas.style.width = `${width}px`;
      activeCanvas.style.height = `${height}px`;
      activeContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function makeParticle(): Particle {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38,
        radius: Math.random() * 1.35 + 0.45,
        alpha: Math.random() * 0.48 + 0.18
      };
    }

    function resetParticle(particle: Particle) {
      const next = makeParticle();
      particle.x = next.x;
      particle.y = next.y;
      particle.vx = next.vx;
      particle.vy = next.vy;
      particle.radius = next.radius;
      particle.alpha = next.alpha;
    }

    function draw() {
      activeContext.clearRect(0, 0, width, height);
      activeContext.strokeStyle = "rgba(26, 108, 246, 0.035)";
      activeContext.lineWidth = 1;

      for (let x = 0; x < width; x += 60) {
        activeContext.beginPath();
        activeContext.moveTo(x, 0);
        activeContext.lineTo(x, height);
        activeContext.stroke();
      }

      for (let y = 0; y < height; y += 60) {
        activeContext.beginPath();
        activeContext.moveTo(0, y);
        activeContext.lineTo(width, y);
        activeContext.stroke();
      }

      particles.forEach((particle, index) => {
        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const dx = particle.x - next.x;
          const dy = particle.y - next.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120) {
            activeContext.beginPath();
            activeContext.moveTo(particle.x, particle.y);
            activeContext.lineTo(next.x, next.y);
            activeContext.strokeStyle = `rgba(61, 142, 255, ${0.15 * (1 - distance / 120)})`;
            activeContext.stroke();
          }
        }

        const mouseDx = particle.x - mouseX;
        const mouseDy = particle.y - mouseY;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        if (mouseDistance < 160) {
          activeContext.beginPath();
          activeContext.moveTo(particle.x, particle.y);
          activeContext.lineTo(mouseX, mouseY);
          activeContext.strokeStyle = `rgba(0, 212, 255, ${0.2 * (1 - mouseDistance / 160)})`;
          activeContext.stroke();
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height) {
          resetParticle(particle);
        }

        activeContext.beginPath();
        activeContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        activeContext.fillStyle = `rgba(61, 142, 255, ${particle.alpha})`;
        activeContext.fill();
      });

      frame = window.requestAnimationFrame(draw);
    }

    function handleMouseMove(event: MouseEvent) {
      mouseX = event.clientX;
      mouseY = event.clientY;
      activeGlow.style.transform = `translate(${mouseX - 150}px, ${mouseY - 150}px)`;
      activeGlow.style.opacity = "1";
    }

    resize();
    const particleCount = window.matchMedia("(max-width: 600px)").matches ? 40 : 80;
    particles.push(...Array.from({ length: particleCount }, makeParticle));
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [resolvedTheme]);

  return (
    <>
      <canvas className="themeCanvas" ref={canvasRef} aria-hidden="true" />
      <div className="themeCursorGlow" ref={glowRef} aria-hidden="true" />
    </>
  );
}
