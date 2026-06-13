"use client";

import { Clipboard } from "lucide-react";
import { useState } from "react";

export function CopyWaButton({ text, disabled = false, label = "Copy WA" }: { text: string; disabled?: boolean; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    if (disabled) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      window.prompt("Copy teks ini untuk WhatsApp:", text);
    }
  }

  return (
    <button className="secondaryButton compactButton" type="button" onClick={copyText} disabled={disabled}>
      <Clipboard size={15} /> {copied ? "Tersalin" : label}
    </button>
  );
}
