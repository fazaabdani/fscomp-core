"use client";

export function DeleteTestimonialButton({ buyerName }: { buyerName: string }) {
  return (
    <button
      className="secondaryButton compactButton dangerButton"
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(`Hapus testimoni dari ${buyerName}?\n\nTidak bisa dibatalkan.`);
        if (!confirmed) event.preventDefault();
      }}
    >
      Hapus
    </button>
  );
}
