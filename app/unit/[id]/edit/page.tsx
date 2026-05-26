import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUnitForEdit } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { updateUnitAction } from "./actions";

export default async function EditUnitPage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string } }) {
  requireRole(["admin"]);
  const unit = await getUnitForEdit(params.id);
  if (!unit) notFound();

  const action = updateUnitAction.bind(null, unit.id);
  const errorMessage =
    searchParams?.error === "duplicate-unit"
      ? "Nomor unit ini sudah dipakai unit lain di batch yang sama."
      : "";

  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Edit Unit</p>
          <h1>Unit {unit.nomorUnit} - {unit.model}</h1>
        </div>
      </div>

      <form className="panel formGrid" action={action}>
        {errorMessage ? <div className="infoBox dangerInfo">{errorMessage}</div> : null}
        <div className="numberGrid">
          <label>Nomor Unit<input name="nomorUnit" defaultValue={unit.nomorUnit} required /></label>
          <label>Batch<input defaultValue={unit.batchName} disabled /></label>
        </div>
        <div className="numberGrid">
          <label>Model<input name="model" defaultValue={unit.model} required /></label>
          <label>Processor<input name="processor" defaultValue={unit.processor} required /></label>
        </div>
        <div className="numberGrid">
          <label>RAM<input name="ram" defaultValue={unit.ram} required /></label>
          <label>SSD<input name="ssd" defaultValue={unit.ssd} required /></label>
        </div>
        <div className="numberGrid">
          <label>Seri SSD<input name="ssdSerial" defaultValue={unit.ssdSerial} /></label>
          <label>Status QC
            <select name="statusObservasi" defaultValue={unit.statusObservasi}>
              <option value="VERIFIED">VERIFIED</option>
              <option value="VERIFIED_WITH_NOTES">VERIFIED WITH NOTES</option>
              <option value="RECHECK">RECHECK</option>
              <option value="CANDIDATE_RETUR">CANDIDATE RETUR</option>
            </select>
          </label>
        </div>
        <div className="numberGrid">
          <label>Harga Modal<input name="hargaModal" inputMode="numeric" defaultValue={`Rp ${unit.hargaModal.toLocaleString("id-ID")}`} /></label>
          <label>Harga Jual<input name="hargaJualRekomendasi" inputMode="numeric" defaultValue={`Rp ${unit.hargaJualRekomendasi.toLocaleString("id-ID")}`} required /></label>
        </div>
        <div className="numberGrid">
          <label>Ukuran LCD<input name="lcdSize" defaultValue={unit.lcdSize} /></label>
          <label>Resolusi Layar<input name="lcdResolution" defaultValue={unit.lcdResolution} /></label>
        </div>
        <div className="numberGrid">
          <label>SSD Health (%)<input name="ssdHealth" type="number" min="0" max="100" defaultValue={unit.ssdHealth} /></label>
          <label>Battery Health (%)<input name="batteryHealth" type="number" min="0" max="100" defaultValue={unit.batteryHealth} /></label>
        </div>
        <label>Touchscreen
          <select name="isTouchscreen" defaultValue={unit.isTouchscreen ? "Ya" : "Tidak"}>
            <option>Tidak</option>
            <option>Ya</option>
          </select>
        </label>
        <label>Lokasi stok
          <select name="stockLocation" defaultValue={unit.stockLocation ?? "WIRADESA"}>
            <option value="WIRADESA">Wiradesa utama</option>
            <option value="KAJEN">Kajen secondary</option>
          </select>
        </label>
        <label>Link foto katalog
          <input name="catalogImageUrl" defaultValue={unit.catalogImageUrl} placeholder="Link Google Drive / link foto langsung" />
          <small>Opsional. Bisa diisi setelah unit difoto dan siap dipajang di katalog.</small>
        </label>
        <button className="primaryButton" type="submit">Simpan Perubahan Unit</button>
      </form>
    </section>
  );
}
