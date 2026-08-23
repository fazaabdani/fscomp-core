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
  const [location, setLocation] = useState(units[0]?.stockLocation === "Kajen" ? "KAJEN" : "WIRADESA");

  function selectUnit(nextUnitId: string) {
    setUnitId(nextUnitId);
    const unit = units.find((candidate) => candidate.id === nextUnitId);
    setSoldPrice(unit?.hargaJualRekomendasi ?? 0);
    setLocation(unit?.stockLocation === "Kajen" ? "KAJEN" : "WIRADESA");
  }

  return (
    <>
      <label>
        Unit
        <select name="unitId" value={unitId} onChange={(event) => selectUnit(event.target.value)} required>
          {units.map((unit) => (
            <option value={unit.id} key={unit.id}>
              Unit {unit.nomorUnit} - {unit.model} - stok {unit.stockLocation} - {formatRupiah(unit.hargaJualRekomendasi)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Lokasi transaksi / kop nota
        <select name="location" value={location} onChange={(event) => setLocation(event.target.value)}>
          <option value="WIRADESA">Wiradesa / FS Comp</option>
          <option value="KAJEN">Kajen / FS.ID</option>
        </select>
        <small className="formHint">Default ikut lokasi stok unit yang dipilih, tapi ubah kalau laptopnya sebenarnya dijual di toko lain (pindah stok dulu, atau dibawa ke cabang lain).</small>
      </label>
      <label>
        Harga jual final
        <input name="soldPrice" type="number" inputMode="numeric" min="0" step="1000" value={soldPrice} onChange={(event) => setSoldPrice(Number(event.target.value))} required />
      </label>
    </>
  );
}
