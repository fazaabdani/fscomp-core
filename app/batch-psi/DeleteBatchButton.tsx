"use client";

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
        className="secondaryButton dangerButton"
        type="submit"
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
        Hapus Batch
      </button>
    </>
  );
}
