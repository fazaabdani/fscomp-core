"use client";

import { Trash2 } from "lucide-react";

export function DeleteBatchButton({
  batchLabel,
  currentUsername,
  unitCount
}: {
  batchLabel: string;
  currentUsername: string;
  unitCount: number;
}) {
  return (
    <>
      <input name="confirmUsername" type="hidden" />
      <button
        className="batchTrashButton"
        type="submit"
        aria-label={`Hapus batch ${batchLabel}`}
        title="Hapus batch ini (perlu konfirmasi)"
        onClick={(event) => {
          const typedUsername = window.prompt(
            `Hapus batch ${batchLabel}?\n\n${unitCount} unit aktif di batch ini akan ikut dihapus beserta data QC-nya. Unit yang punya nota/transaksi tidak bisa dihapus.\n\nKetik username login Anda untuk konfirmasi: ${currentUsername}`
          );
          if (typedUsername !== currentUsername) {
            event.preventDefault();
            if (typedUsername !== null) window.alert("Konfirmasi dibatalkan: username tidak cocok.");
            return;
          }

          const form = event.currentTarget.form;
          const confirmationInput = form?.elements.namedItem("confirmUsername");
          if (confirmationInput instanceof HTMLInputElement) confirmationInput.value = typedUsername;
        }}
      >
        <Trash2 size={18} />
      </button>
    </>
  );
}
