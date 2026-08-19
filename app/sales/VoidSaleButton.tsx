"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function VoidSaleButton({ saleLabel, compact = false }: { saleLabel: string; compact?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`secondaryButton dangerButton ${compact ? "compactButton" : ""}`}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={(event) => {
        const confirmed = window.confirm(
          `Batalkan transaksi ${saleLabel}?\n\nUnit akan kembali ke stok siap jual dan nota akan ditandai batal. Lanjutkan hanya kalau transaksi memang salah/batal.`
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      {pending ? <Loader2 size={14} className="spinIcon" /> : null}
      {pending ? "Memproses..." : compact ? "Batalkan" : "Batalkan Penjualan"}
    </button>
  );
}
