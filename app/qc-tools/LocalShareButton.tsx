"use client";

type LocalShareButtonProps = {
  fileUrl: string;
  unc: string;
};

export function LocalShareButton({ fileUrl, unc }: LocalShareButtonProps) {
  async function openShare() {
    try {
      await navigator.clipboard.writeText(unc);
    } catch {
      // Browser clipboard permission is best-effort only.
    }
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button className="localShareButton" type="button" onClick={openShare}>
      Buka folder lokal
    </button>
  );
}
