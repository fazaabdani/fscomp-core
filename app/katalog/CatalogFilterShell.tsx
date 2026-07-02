"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function CatalogFilterShell({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 820px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeFromEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeFromEscape);
    };
  }, [open]);

  return (
    <div className={`catalogFilterShell ${open ? "isOpen" : ""}`}>
      <button className="catalogFilterMobileButton" type="button" onClick={() => setOpen(true)} aria-expanded={open}>
        <SlidersHorizontal size={18} />
        <span>Filter &amp; Urutkan</span>
        {activeCount > 0 ? <strong>{activeCount} aktif</strong> : null}
      </button>
      <button className="catalogFilterBackdrop" type="button" aria-label="Tutup filter" onClick={() => setOpen(false)} />
      <div className="catalogFilterDrawer" role="dialog" aria-label="Filter dan urutkan katalog">
        <div className="catalogFilterDrawerHeader">
          <div>
            <strong>Filter &amp; Urutkan</strong>
            <span>{activeCount > 0 ? `${activeCount} filter aktif` : "Pilih laptop yang paling sesuai"}</span>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Tutup filter"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
