"use client";

import { useEffect } from "react";

export function KatalogDynamics() {
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

  return null;
}
