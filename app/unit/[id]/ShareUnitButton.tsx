"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

// Link yang dibagikan diberi tanda utm supaya Analitik Katalog tahu klik berasal dari bagikan (pembeli) atau dari admin,
// bukan lagi tercampur di "langsung".
export function ShareUnitButton({
  model,
  spec,
  price,
  medium = "buyer"
}: {
  model: string;
  spec?: string;
  price?: string;
  medium?: "buyer" | "admin";
}) {
  const [copied, setCopied] = useState(false);

  async function shareUnit() {
    const link = `${window.location.origin}${window.location.pathname}?utm_source=wa&utm_medium=${medium}&utm_campaign=bagikan-unit`;
    const text = [`*${model}*`, spec, price ? `Harga ${price}` : "", "QC ketat, garansi toko. Stok FS Comp Pekalongan.", link].filter(Boolean).join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `${model} - FS Comp`, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="secondaryButton" type="button" onClick={shareUnit}>
      {copied ? <Check size={17} /> : <Share2 size={17} />}
      {copied ? "Teks Disalin" : medium === "admin" ? "Bagikan ke WA" : "Bagikan Produk"}
    </button>
  );
}
