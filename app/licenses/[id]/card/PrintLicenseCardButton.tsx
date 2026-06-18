"use client";

import { FileDown } from "lucide-react";

export function PrintLicenseCardButton() {
  return (
    <button className="primaryButton" type="button" onClick={() => window.print()}>
      <FileDown size={16} /> Cetak / Save PDF
    </button>
  );
}
