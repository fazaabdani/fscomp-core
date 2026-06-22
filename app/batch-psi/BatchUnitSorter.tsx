"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";

type SortKey = "unit" | "ready" | "status" | "foto" | "model" | "modal";

type SortableUnit = {
  id: string;
  nomorUnit: string;
  model: string;
  statusObservasi: string;
  catalogImageUrl: string;
  hargaModal: number;
  content: ReactNode;
};

const options: Array<{ key: SortKey; label: string }> = [
  { key: "unit", label: "Nomor" },
  { key: "ready", label: "Ready" },
  { key: "status", label: "Status" },
  { key: "foto", label: "Foto" },
  { key: "model", label: "Model" },
  { key: "modal", label: "Modal" }
];

function sortedUnits(units: SortableUnit[], sort: SortKey) {
  return [...units].sort((a, b) => {
    if (sort === "model") return a.model.localeCompare(b.model, "id", { numeric: true });
    if (sort === "status") return a.statusObservasi.localeCompare(b.statusObservasi, "id", { numeric: true });
    if (sort === "modal") return b.hargaModal - a.hargaModal;
    if (sort === "foto") return Number(Boolean(b.catalogImageUrl)) - Number(Boolean(a.catalogImageUrl));
    if (sort === "ready") {
      const ready = (status: string) => status === "VERIFIED" || status === "VERIFIED WITH NOTES";
      return Number(ready(b.statusObservasi)) - Number(ready(a.statusObservasi));
    }
    return a.nomorUnit.localeCompare(b.nomorUnit, "id", { numeric: true });
  });
}

export function BatchUnitSorter({ units, initialSort = "unit" }: { units: SortableUnit[]; initialSort?: string }) {
  const validInitialSort = options.some((option) => option.key === initialSort) ? initialSort as SortKey : "unit";
  const [sort, setSort] = useState<SortKey>(validInitialSort);
  const visibleUnits = useMemo(() => sortedUnits(units, sort), [sort, units]);

  return (
    <>
      <div className="batchUnitSortBar">
        <span>Sortir unit</span>
        {options.map((option) => (
          <button className={`sortPill ${sort === option.key ? "active" : ""}`} onClick={() => setSort(option.key)} type="button" key={option.key}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="tableLike compact">
        {visibleUnits.map((unit) => <Fragment key={unit.id}>{unit.content}</Fragment>)}
        {visibleUnits.length === 0 ? <div className="emptyState">Tidak ada unit aktif di batch ini.</div> : null}
      </div>
    </>
  );
}
