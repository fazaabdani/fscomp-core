import Link from "next/link";
import { ArrowLeft, Laptop } from "lucide-react";
import { getBatchesForPage } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { createUnitWithInitialQcAction } from "./actions";

export default async function NewUnitPage({ searchParams }: { searchParams?: { batch?: string } }) {
  requireRole(["admin", "teknisi"]);
  const batches = await getBatchesForPage();

  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Tambah Unit</p>
          <h1>Input QC awal singkat</h1>
          <p className="bodyText">Format QC awal dibuat ringkas sesuai alur kerja PSI: data identitas, fitur, minus, lalu keputusan lanjut QC harian atau tidak.</p>
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
          <label>Merk<input name="merk" placeholder="LENOVO / HP / DELL" required /></label>
          <label>Seri<input name="seri" placeholder="THINKPAD T480" required /></label>
        </div>
        <div className="numberGrid">
          <label>Processor<input name="processor" placeholder="I5 GEN 8" required /></label>
          <label>RAM<input name="ram" placeholder="RAM 8GB" required /></label>
        </div>
        <div className="numberGrid">
          <label>Storage<input name="storage" placeholder="SSD 256GB" required /></label>
          <label>Display<input name="display" placeholder="14 INCH FHD / Touchscreen" required /></label>
        </div>

        <label>Fitur tambahan
          <input name="fiturTambahan" placeholder="Keyboard backlit, fingerprint, touchscreen, dll" />
        </label>

        <label>Minus
          <textarea name="minus" placeholder="Contoh: frame layar buka, casing retak, baterai drop, OS belum install." />
        </label>

        <div className="numberGrid">
          <label>Status
            <select name="qcFlowStatus" defaultValue="LANJUT_QC_HARIAN">
              <option value="LANJUT_QC_HARIAN">Lanjut QC harian</option>
              <option value="TAHAN_DULU">Tahan dulu / perlu keputusan</option>
              <option value="CANDIDATE_RETUR">Candidate retur</option>
            </select>
          </label>
          <label>Windows saat QC awal
            <select name="windowsVersion" defaultValue="Windows 11">
              <option>Windows 11</option>
              <option>Windows 10</option>
              <option>Belum install OS</option>
              <option>OS bermasalah</option>
            </select>
          </label>
        </div>

        <div className="numberGrid">
          <label>Harga Modal<input name="hargaModal" type="number" inputMode="numeric" step="1000" placeholder="2850000" /></label>
          <label>Harga Jual<input name="hargaJualRekomendasi" type="number" inputMode="numeric" step="1000" placeholder="3650000" required /></label>
        </div>
        <label>Lokasi stok awal
          <select name="stockLocation" defaultValue="WIRADESA">
            <option value="WIRADESA">Wiradesa utama</option>
            <option value="KAJEN">Kajen secondary</option>
          </select>
        </label>
        <label>Link foto katalog
          <input name="catalogImageUrl" placeholder="Opsional, bisa diisi nanti setelah unit difoto" />
        </label>

        <div className="numberGrid">
          <label>SSD Health (%)<input name="ssdHealth" type="number" min="0" max="100" defaultValue={90} required /></label>
          <label>Battery Health (%)<input name="batteryHealth" type="number" min="0" max="100" defaultValue={80} required /></label>
        </div>

        <div className="infoBox compactInfo">
          Unit Intel Gen 8 ke atas wajib pakai Windows 11. Kalau saat masuk batch masih Windows 10 tidak apa-apa, nanti status siap jual mengikuti input <strong>Seri Windows</strong> di QC harian terbaru.
        </div>

        <button className="primaryButton" type="submit">Simpan Unit dan QC Awal</button>
      </form>
    </section>
  );
}
