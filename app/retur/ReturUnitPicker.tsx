"use client";

import { useState } from "react";

export type ReturUnitOption = {
  id: string;
  nomorUnit: string;
  model: string;
  spec: string;
  nomorBatch: string;
};

export function ReturUnitPicker({ units, preselectAll }: { units: ReturUnitOption[]; preselectAll: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preselectAll ? units.map((unit) => unit.id) : []));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="returUnitPicker">
      <div className="buttonRow noMargin">
        <button className="secondaryButton compactButton" type="button" onClick={() => setSelected(new Set(units.map((unit) => unit.id)))}>Pilih semua</button>
        <button className="secondaryButton compactButton" type="button" onClick={() => setSelected(new Set())}>Kosongkan</button>
        <strong>{selected.size} unit dipilih</strong>
      </div>
      <div className="returUnitList">
        {units.map((unit) => (
          <label className="returUnitItem" key={unit.id}>
            <input type="checkbox" name="unit" value={unit.id} checked={selected.has(unit.id)} onChange={() => toggle(unit.id)} />
            <span>
              <strong>{unit.nomorUnit}</strong> {unit.model}
              <small>{unit.spec} / {unit.nomorBatch}</small>
            </span>
          </label>
        ))}
      </div>
      <button className="primaryButton" type="submit" disabled={selected.size === 0}>Buat Resi Retur</button>
    </div>
  );
}
