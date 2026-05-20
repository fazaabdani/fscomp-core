import Link from "next/link";
import { ArrowLeft, Laptop } from "lucide-react";
import { getBatchesForPage } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { createUnitWithInitialQcAction } from "./actions";

const qcOptions = ["OK", "NOTES", "FAIL"];

export default async function NewUnitPage({ searchParams }: { searchParams?: { batch?: string } }) {
  requireRole(["admin", "teknisi"]);
  const batches = await getBatchesForPage();

  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Tambah Unit</p>
          <h1>Input data laptop dan QC awal</h1>
        </div>
      </div>

      <form className="panel formGrid" action={createUnitWithInitialQcAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Data utama</p>
            <h2>Unit masuk PSI</h2>
          </div>
          <Laptop size={22} />
        </div>
        <div className="numberGrid">
          <label>Nomor Unit<input name="nomorUnit" placeholder="4 atau 4a" required /></label>
          <label>Batch
            <select name="batchId" defaultValue={searchParams?.batch} required>
              {batches.map((batch) => <option value={batch.id} key={batch.id}>{batch.nomorBatch}</option>)}
            </select>
          </label>
        </div>
        <div className="numberGrid">
          <label>Model<input name="model" placeholder="Lenovo ThinkPad T480" required /></label>
          <label>Processor<input name="processor" placeholder="Intel Core i5 Gen 8" required /></label>
        </div>
        <div className="numberGrid">
          <label>RAM<input name="ram" placeholder="16GB DDR4" required /></label>
          <label>SSD<input name="ssd" placeholder="256GB NVMe" required /></label>
        </div>
        <div className="numberGrid">
          <label>Seri SSD<input name="ssdSerial" placeholder="Serial SSD" /></label>
          <label>Harga Jual<input name="hargaJualRekomendasi" type="number" placeholder="3650000" required /></label>
        </div>
        <div className="numberGrid">
          <label>Harga Modal<input name="hargaModal" type="number" placeholder="2850000" /></label>
          <label>Status QC
            <select name="statusObservasi" defaultValue="VERIFIED">
              <option value="VERIFIED">VERIFIED</option>
              <option value="VERIFIED_WITH_NOTES">VERIFIED WITH NOTES</option>
              <option value="RECHECK">RECHECK</option>
              <option value="CANDIDATE_RETUR">CANDIDATE RETUR</option>
            </select>
          </label>
        </div>
        <div className="numberGrid">
          <label>Ukuran LCD<input name="lcdSize" placeholder="14 inch" /></label>
          <label>Resolusi Layar<input name="lcdResolution" placeholder="1920x1080" /></label>
        </div>
        <div className="numberGrid">
          <label>SSD Health (%)<input name="ssdHealth" type="number" min="0" max="100" required /></label>
          <label>Battery Health (%)<input name="batteryHealth" type="number" min="0" max="100" required /></label>
        </div>
        <label>Touchscreen
          <select name="isTouchscreen" defaultValue="Tidak">
            <option>Tidak</option>
            <option>Ya</option>
          </select>
        </label>

        <div className="panelSubsection">
          <p className="eyebrow">Checklist QC Awal</p>
          <div className="qcSelectGrid">
            {["bodyBroken", "karetBawah", "repaint", "touchpad", "trackpoint", "usb", "kamera", "speaker", "mic"].map((field) => (
              <label key={field}>{field}
                <select name={field} defaultValue="OK">
                  {qcOptions.map((option) => <option value={option} key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>

        <label>Catatan QC Awal<textarea name="catatan" placeholder="Catatan body, repaint, karet bawah, kamera, USB, speaker, mic, dan lainnya." /></label>
        <button className="primaryButton" type="submit">Simpan Unit dan QC Awal</button>
      </form>
    </section>
  );
}
