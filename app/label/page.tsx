import { QRCodeSVG } from "qrcode.react";
import { units } from "@/lib/api";
import { statusTone } from "@/lib/constants";
import { PrintButton } from "./PrintButton";

export default function LabelPage({ searchParams }: { searchParams?: { unit?: string } }) {
  const selectedId = searchParams?.unit ?? units[0].id;
  const selected = units.find((unit) => unit.id === selectedId) ?? units[0];
  const detailUrl = `https://core.fscomp.id/unit/${selected.id}`;

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
          <div className="buttonRow">
            <button className="secondaryButton" type="submit">Preview</button>
            <PrintButton />
          </div>
        </form>

        <div className="labelSheet">
          <article className="unitLabel">
            <div className="labelTop">
              <div>
                <span className="labelBrand">FS Comp</span>
                <h2>Unit {selected.nomorUnit}</h2>
              </div>
              <QRCodeSVG value={detailUrl} size={86} fgColor="#0f2f6b" />
            </div>
            <div className="labelBody">
              <strong>{selected.model}</strong>
              <span>{selected.processor}</span>
              <span>{selected.ram} / {selected.ssd}</span>
            </div>
            <div className="labelFooter">
              <span className={`statusPill ${statusTone[selected.statusObservasi]}`}>{selected.statusObservasi}</span>
              <span>QC {selected.qcAwal.tanggal} / {selected.qcAwal.checker}</span>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
