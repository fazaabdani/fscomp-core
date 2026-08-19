"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function RestoreSaleButton({ saleLabel, compact = false }: { saleLabel: string; compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`secondaryButton ${compact ? "compactButton" : ""}`}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        const confirmed = window.confirm(
          `Batal batalkan transaksi ${saleLabel}?\n\nTransaksi akan aktif lagi dan unit kembali ditandai terjual. Lanjutkan hanya kalau pembatalan tadi salah.`
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      {pending ? <Loader2 size={14} className="spinIcon" /> : null}
      {pending ? "Memproses..." : compact ? "Batal batalkan" : "Batal Batalkan Penjualan"}
    </button>
  );
}
