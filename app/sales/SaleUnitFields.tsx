"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/api";

type SaleUnit = {
  id: string;
  nomorUnit: string;
  model: string;
  stockLocation: string;
  hargaJualRekomendasi: number;
};

export function SaleUnitFields({ units }: { units: SaleUnit[] }) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [soldPrice, setSoldPrice] = useState(units[0]?.hargaJualRekomendasi ?? 0);

  function selectUnit(nextUnitId: string) {
    setUnitId(nextUnitId);
    setSoldPrice(units.find((unit) => unit.id === nextUnitId)?.hargaJualRekomendasi ?? 0);
  }

  return (
    <>
      <label>
        Unit dan lokasi toko nota
        <select name="unitId" value={unitId} onChange={(event) => selectUnit(event.target.value)} required>
          {units.map((unit) => (
            <option value={unit.id} key={unit.id}>
              Unit {unit.nomorUnit} - {unit.model} - {unit.stockLocation} - {formatRupiah(unit.hargaJualRekomendasi)}
            </option>
          ))}
        </select>
        <small className="formHint">Lokasi nota otomatis mengikuti lokasi unit: Wiradesa memakai kop FS Comp, Kajen memakai kop FS.ID.</small>
      </label>
      <label>
        Harga jual final
        <input name="soldPrice" type="number" inputMode="numeric" min="0" step="1000" value={soldPrice} onChange={(event) => setSoldPrice(Number(event.target.value))} required />
      </label>
    </>
  );
}
