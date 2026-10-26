"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

// Label dibaca dari pesan WhatsApp yang sudah terisi otomatis ("Saya tertarik dengan Unit X - Model.")
// supaya laporan GA4 bisa menunjukkan unit mana yang paling sering ditanyakan.
export function whatsappLabel(href: string) {
  try {
    const text = new URL(href).searchParams.get("text");
    if (!text) return "chat_admin";
    const unitLine = text.split("\n").find((line) => /\bUnit\b/.test(line));
    if (unitLine) return unitLine.replace(/^Saya tertarik dengan\s*/i, "").replace(/\.$/, "").slice(0, 100);
    return "tanya_admin";
  } catch {
    return "wa_link";
  }
}

function isWhatsappHost(href: string) {
  try {
    const host = new URL(href).hostname;
    return host === "wa.me" || host === "api.whatsapp.com";
  } catch {
    return false;
  }
}

export function TrackingEvents() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !isWhatsappHost(anchor.href)) return;
      const label = whatsappLabel(anchor.href);
      window.gtag?.("event", "whatsapp_click", { event_category: "engagement", event_label: label });
      window.fbq?.("track", "Contact", { content_name: label });
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
