"use client";

import { useState } from "react";

type StockLocation = "WIRADESA" | "KAJEN";

function locationLabel(location: StockLocation) {
  return location === "KAJEN" ? "Kajen secondary" : "Wiradesa utama";
}

export function StockLocationField({ location, canChange }: { location: StockLocation; canChange: boolean }) {
  const [value, setValue] = useState(location);

  if (!canChange) {
    return (
      <label>
        Lokasi stok
        <input value={locationLabel(location)} readOnly />
        <input name="stockLocation" type="hidden" value={location} />
        <small className="formHint">Akun ini tidak memiliki akses untuk memindahkan lokasi stok.</small>
      </label>
    );
  }

  function changeLocation(nextLocation: StockLocation) {
    if (nextLocation === location || window.confirm(`Pindahkan lokasi stok dari ${locationLabel(location)} ke ${locationLabel(nextLocation)}? Perubahan ini akan dicatat.`)) {
      setValue(nextLocation);
    }
  }

  return (
    <label>
      Lokasi stok
      <select name="stockLocation" value={value} onChange={(event) => changeLocation(event.target.value as StockLocation)}>
        <option value="WIRADESA">Wiradesa utama</option>
        <option value="KAJEN">Kajen secondary</option>
      </select>
      <small className="formHint">Perpindahan lokasi dicatat otomatis pada riwayat unit.</small>
    </label>
  );
}
