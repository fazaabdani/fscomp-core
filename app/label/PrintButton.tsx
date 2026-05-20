"use client";

export function PrintButton() {
  return (
    <button className="primaryButton" type="button" onClick={() => window.print()}>
      Cetak Label
    </button>
  );
}
