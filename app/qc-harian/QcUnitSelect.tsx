"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type QcUnit = { id: string; nomorUnit: string; model: string };

export function QcUnitSelect({ units, selectedUnitId }: { units: QcUnit[]; selectedUnitId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectUnit(unitId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("unit", unitId);
    params.delete("saved");
    params.delete("error");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <label>
      Unit
      <select name="unitId" value={selectedUnitId ?? ""} onChange={(event) => selectUnit(event.target.value)} required>
        {units.map((unit) => <option value={unit.id} key={unit.id}>Unit {unit.nomorUnit} - {unit.model}</option>)}
      </select>
      <small className="formHint">Pilih unit dahulu agar health dan lokasi yang tampil sesuai unit.</small>
    </label>
  );
}
