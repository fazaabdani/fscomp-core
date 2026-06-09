"use client";

export function DeleteUnitButton({ unitLabel }: { unitLabel: string }) {
  return (
    <button
      className="secondaryButton compactButton dangerButton"
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(`Hapus ${unitLabel} dari batch?\n\nData QC unit ini juga akan ikut dihapus. Lanjutkan hanya kalau memang salah input.`);
        if (!confirmed) event.preventDefault();
      }}
    >
      Hapus
    </button>
  );
}
