"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareUnitButton({ model }: { model: string }) {
  const [copied, setCopied] = useState(false);

  async function shareUnit() {
    const url = window.location.href;
    const shareData = {
      title: `${model} - Katalog FS Comp`,
      text: `Lihat ${model} di Katalog FS Comp.`,
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="secondaryButton" type="button" onClick={shareUnit}>
      {copied ? <Check size={17} /> : <Share2 size={17} />}
      {copied ? "Tautan Disalin" : "Bagikan Produk"}
    </button>
  );
}
