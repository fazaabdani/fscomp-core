"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Salin link ini:", url);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 2000);
  }
  return (
    <button type="button" className="secondaryButton" onClick={copy}>
      {done ? "Link tersalin" : "Salin link"}
    </button>
  );
}
