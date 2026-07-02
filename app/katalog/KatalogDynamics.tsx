"use client";

import { useEffect } from "react";

export function KatalogDynamics({ navigationKey }: { navigationKey: string }) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".catalogReveal"));
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count-target]"));
    const counterTimers: number[] = [];
    const scrollKey = `fscomp-catalog-scroll:${window.location.pathname}${window.location.search}`;
    let savedScroll = 0;

    try {
      savedScroll = Number(window.sessionStorage.getItem(scrollKey) ?? "0");
    } catch {
      savedScroll = 0;
    }

    if (Number.isFinite(savedScroll) && savedScroll > 0) {
      window.requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: "auto" }));
    }

    function saveScroll() {
      try {
        window.sessionStorage.setItem(scrollKey, String(Math.max(0, window.scrollY)));
      } catch {
        // Some privacy modes disable session storage; navigation still works without restoration.
      }
    }

    window.addEventListener("pagehide", saveScroll);

    if (reduceMotion) {
      revealItems.forEach((item) => item.classList.add("isVisible"));
      counters.forEach((counter) => {
        const finalValue = Number(counter.dataset.countTarget ?? "0");
        const suffix = counter.dataset.countSuffix ?? "";
        if (Number.isFinite(finalValue)) counter.textContent = `${finalValue}${suffix}`;
      });
      return () => window.removeEventListener("pagehide", saveScroll);
    }

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

        let current = 0;
        const step = Math.max(1, Math.ceil(finalValue / 36));
        const timer = window.setInterval(() => {
          current = Math.min(finalValue, current + step);
          target.textContent = `${current}${suffix}`;
          if (current >= finalValue) window.clearInterval(timer);
        }, 24);
        counterTimers.push(timer);
        counterObserver.unobserve(target);
      });
    }, { threshold: 0.35 });

    counters.forEach((counter) => counterObserver.observe(counter));

    return () => {
      window.removeEventListener("pagehide", saveScroll);
      counterTimers.forEach((timer) => window.clearInterval(timer));
      revealObserver.disconnect();
      counterObserver.disconnect();
    };
  }, [navigationKey]);

  return null;
}
