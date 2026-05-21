"use client";

import { Printer } from "lucide-react";

export function PrintReceiptButton() {
  return (
    <button className="primaryButton printHidden" type="button" onClick={() => window.print()}>
      <Printer size={17} /> Cetak Nota
    </button>
  );
}
