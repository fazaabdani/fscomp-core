import { QRCodeSVG } from "qrcode.react";
import { formatRupiah } from "@/lib/api";
import { statusTone } from "@/lib/constants";
import { getUnitsForLabel } from "@/lib/db-data";
import { PrintButton } from "./PrintButton";

function healthValue(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? `${numberValue}%` : "-";
}

export default async function LabelPage({ searchParams }: { searchParams?: { unit?: string; mode?: string } }) {
  const units = await getUnitsForLabel();
  const selectedId = searchParams?.unit ?? units[0].id;
  const mode = searchParams?.mode === "qc" ? "qc" : "simple";
  const selected = units.find((unit) => unit.id === selectedId) ?? units[0];
  const detailUrl = `https://core.fscomp.id/unit/${selected.id}`;
  const selectedWithHealth = selected as typeof selected & { ssdHealth?: number; batteryHealth?: number };
  const qcItemMap = new Map<string, string | number>(
    [
      ...Object.entries(selected.qcAwal.hardware ?? {}),
      ...Object.entries(selected.qcAwal.software ?? {})
    ].filter(([key]) => key !== "Office")
  );
  qcItemMap.set("SSD", healthValue(selectedWithHealth.ssdHealth ?? qcItemMap.get("SSD")));
  qcItemMap.set("Battery", healthValue(selectedWithHealth.batteryHealth ?? qcItemMap.get("Battery")));
  qcItemMap.delete("Office");
  const qcItems = Array.from(qcItemMap.entries());

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Label QR</p>
          <h1>Cetak label unit 7x5cm</h1>
        </div>
      </div>

      <div className="labelLayout">
        <form className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Pilih unit</p>
              <h2>Preview label</h2>
            </div>
          </div>
          <select name="unit" defaultValue={selected.id}>
            {units.map((unit) => (
              <option value={unit.id} key={unit.id}>Unit {unit.nomorUnit} - {unit.model}</option>
            ))}
          </select>
          <label>
            Jenis label
            <select name="mode" defaultValue={mode}>
              <option value="simple">Label tempel ringkas</option>
              <option value="qc">Label hasil QC lengkap</option>
            </select>
          </label>
          <div className="buttonRow">
            <button className="secondaryButton" type="submit">Preview</button>
            <PrintButton />
          </div>
        </form>

        <div className="labelSheet">
          <article className={mode === "qc" ? "unitLabel qcCompleteLabel" : "unitLabel"}>
            <div className="labelTop">
              <div>
                <span className="labelBrand">FS Comp</span>
                <h2>{mode === "qc" ? "QC Unit" : `Unit ${selected.nomorUnit}`}</h2>
              </div>
              <QRCodeSVG value={detailUrl} size={mode === "qc" ? 68 : 86} fgColor="#0f2f6b" />
            </div>
            <div className="labelBody">
              <strong>{selected.model}</strong>
              <span>{selected.processor}</span>
              <span>{selected.ram} / {selected.ssd}</span>
              <b>{formatRupiah(selected.hargaJualRekomendasi)}</b>
              {mode === "qc" ? (
                <div className="qcMiniGrid">
                  {qcItems.slice(0, 18).map(([key, value]) => (
                    <span key={key}><em>{key}</em><strong>{value}</strong></span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="labelFooter">
              <span className={`statusPill ${statusTone[selected.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{selected.statusObservasi}</span>
              <span>QC {selected.qcAwal.tanggal} / {selected.qcAwal.checker}</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
