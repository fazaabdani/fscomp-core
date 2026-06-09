"use client";

export function VoidSaleButton({ saleLabel, compact = false }: { saleLabel: string; compact?: boolean }) {
  return (
    <button
      className={`secondaryButton ${compact ? "compactButton" : ""}`}
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(
          `Batalkan transaksi ${saleLabel}?\n\nUnit akan kembali ke stok siap jual dan nota akan ditandai batal. Lanjutkan hanya kalau transaksi memang salah/batal.`
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      {compact ? "Batalkan" : "Batalkan Penjualan"}
    </button>
  );
}
