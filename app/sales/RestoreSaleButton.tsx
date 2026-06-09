"use client";

export function RestoreSaleButton({ saleLabel, compact = false }: { saleLabel: string; compact?: boolean }) {
  return (
    <button
      className={`secondaryButton ${compact ? "compactButton" : ""}`}
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(
          `Batal batalkan transaksi ${saleLabel}?\n\nTransaksi akan aktif lagi dan unit kembali ditandai terjual. Lanjutkan hanya kalau pembatalan tadi salah.`
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      {compact ? "Batal batalkan" : "Batal Batalkan Penjualan"}
    </button>
  );
}
