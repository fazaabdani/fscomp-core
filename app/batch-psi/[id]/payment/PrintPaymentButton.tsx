"use client";

export function PrintPaymentButton() {
  return (
    <button className="primaryButton printHidden" type="button" onClick={() => window.print()}>
      Cetak / Simpan PDF
    </button>
  );
}
