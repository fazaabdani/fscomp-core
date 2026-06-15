"use client";

import { useEffect, useRef } from "react";

export function KatalogDynamics() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".catalogReveal"));
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count-target]"));

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("isVisible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => revealObserver.observe(item));

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const target = entry.target as HTMLElement;
        const finalValue = Number(target.dataset.countTarget ?? "0");
        const suffix = target.dataset.countSuffix ?? "";
        if (!Number.isFinite(finalValue)) return;

        if (reduceMotion) {
          target.textContent = `${finalValue}${suffix}`;
          counterObserver.unobserve(target);
          return;
        }

        let current = 0;
        const step = Math.max(1, Math.ceil(finalValue / 36));
        const timer = window.setInterval(() => {
          current = Math.min(finalValue, current + step);
          target.textContent = `${current}${suffix}`;
          if (current >= finalValue) window.clearInterval(timer);
        }, 24);
        counterObserver.unobserve(target);
      });
    }, { threshold: 0.35 });

    counters.forEach((counter) => counterObserver.observe(counter));

    return () => {
      revealObserver.disconnect();
      counterObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (!canvas || !glow) return;

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
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        radius: Math.random() * 1.3 + 0.5,
        alpha: Math.random() * 0.45 + 0.16
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
      activeContext.strokeStyle = "rgba(55, 163, 255, 0.035)";
      activeContext.lineWidth = 1;

      for (let x = 0; x < width; x += 64) {
        activeContext.beginPath();
        activeContext.moveTo(x, 0);
        activeContext.lineTo(x, height);
        activeContext.stroke();
      }

      for (let y = 0; y < height; y += 64) {
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
          if (distance < 122) {
            activeContext.beginPath();
            activeContext.moveTo(particle.x, particle.y);
            activeContext.lineTo(next.x, next.y);
            activeContext.strokeStyle = `rgba(55, 163, 255, ${0.13 * (1 - distance / 122)})`;
            activeContext.stroke();
          }
        }

        const mouseDx = particle.x - mouseX;
        const mouseDy = particle.y - mouseY;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        if (mouseDistance < 165) {
          activeContext.beginPath();
          activeContext.moveTo(particle.x, particle.y);
          activeContext.lineTo(mouseX, mouseY);
          activeContext.strokeStyle = `rgba(34, 211, 238, ${0.18 * (1 - mouseDistance / 165)})`;
          activeContext.stroke();
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > width || particle.y < 0 || particle.y > height) {
          resetParticle(particle);
        }

        activeContext.beginPath();
        activeContext.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        activeContext.fillStyle = `rgba(83, 166, 255, ${particle.alpha})`;
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
    particles.push(...Array.from({ length: 72 }, makeParticle));
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <>
      <canvas className="catalogCanvas" ref={canvasRef} aria-hidden="true" />
      <div className="catalogCursorGlow" ref={glowRef} aria-hidden="true" />
    </>
  );
}
