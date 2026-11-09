"use client";

export function PrintReturButton() {
  return (
    <button className="primaryButton printHidden" type="button" onClick={() => window.print()}>
      Cetak resi
    </button>
  );
}
