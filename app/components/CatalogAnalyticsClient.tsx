"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { activeFilters, deviceOfWidth, sourceOf, unitIdFromPath } from "@/lib/catalog-analytics";
import { whatsappLabel } from "./TrackingEvents";

const ENDPOINT = "/api/analytics/collect";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function store(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function identity() {
  const local = store("local");
  const session = store("session");
  let vid = local?.getItem("fscomp_vid") ?? null;
  if (!vid) {
    vid = randomId();
    try { local?.setItem("fscomp_vid", vid); } catch { /* mode privat: tetap jalan tanpa penyimpanan */ }
  }
  let sid = session?.getItem("fscomp_sid") ?? null;
  if (!sid) {
    sid = randomId();
    try { session?.setItem("fscomp_sid", sid); } catch { /* idem */ }
  }
  return { vid, sid };
}

// Sumber trafik dicatat sekali per sesi (first-touch): UTM > referrer > langsung.
function firstTouch() {
  const session = store("session");
  const saved = session?.getItem("fscomp_ft");
  if (saved) {
    try { return JSON.parse(saved) as { source: string; medium: string | null; campaign: string | null }; } catch { /* hitung ulang */ }
  }
  const value = sourceOf(new URLSearchParams(window.location.search), document.referrer, window.location.hostname);
  try { session?.setItem("fscomp_ft", JSON.stringify(value)); } catch { /* idem */ }
  return value;
}

function send(partial: Record<string, unknown>) {
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
  const { vid, sid } = identity();
  const body = JSON.stringify({ vid, sid, device: deviceOfWidth(window.innerWidth), ...firstTouch(), ...partial });
  try {
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  } catch { /* lanjut ke fetch */ }
  fetch(ENDPOINT, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
}

// Pencatat kunjungan first-party untuk halaman publik (katalog & detail unit). Tanpa data pribadi.
export function CatalogAnalyticsClient() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const lastKey = useRef("");

  useEffect(() => {
    const key = `${pathname}?${search}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    const params = new URLSearchParams(search);
    const unitId = unitIdFromPath(pathname);
    send({ type: unitId ? "UNIT_VIEW" : "PAGEVIEW", path: pathname, unitId });

    if (pathname === "/katalog") {
      const query = params.get("q")?.trim() ?? "";
      const filters = activeFilters(params);
      if (query || Object.keys(filters).length > 0) {
        // Tunggu tampilan hasil selesai dirender, lalu baca jumlah hasil yang ditampilkan di halaman.
        const timer = window.setTimeout(() => {
          const shown = Number(document.querySelector(".catalogResultCount strong")?.textContent);
          send({ type: "SEARCH", path: pathname, query, filters, resultCount: Number.isFinite(shown) ? shown : undefined });
        }, 700);
        return () => window.clearTimeout(timer);
      }
    }
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      let host = "";
      try { host = new URL(anchor.href).hostname; } catch { return; }
      if (host !== "wa.me" && host !== "api.whatsapp.com") return;
      // Unit: dari halaman detail, atau dari kartu katalog yang memuat tombol "Tanya Unit" ini.
      let unitId = unitIdFromPath(window.location.pathname);
      if (!unitId) {
        const detail = anchor.closest(".catalogPublicCard")?.querySelector('a[href^="/unit/"]') as HTMLAnchorElement | null;
        if (detail) unitId = unitIdFromPath(new URL(detail.href, window.location.origin).pathname);
      }
      send({ type: "WA_CLICK", path: window.location.pathname, unitId, label: whatsappLabel(anchor.href) });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);

  return null;
}
