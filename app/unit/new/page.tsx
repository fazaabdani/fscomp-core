import Link from "next/link";
import { ArrowLeft, Laptop } from "lucide-react";
import { getBatchesForPage } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { createUnitWithInitialQcAction } from "./actions";

export default async function NewUnitPage({ searchParams }: { searchParams?: { batch?: string; error?: string } }) {
  requireRole(["admin", "teknisi"]);
  const batches = await getBatchesForPage();
  const errorMessage =
    searchParams?.error === "duplicate-unit"
      ? "Nomor unit ini sudah ada di batch yang sama. Pakai nomor lain, misalnya 1a / 1b."
      : searchParams?.error === "required"
        ? "Data utama belum lengkap. Nomor unit, batch, model/seri, processor, RAM, dan storage wajib diisi."
        : "";

  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Tambah Unit</p>
          <h1>Input unit ke batch</h1>
          <p className="bodyText">Tahap ini hanya untuk data spek inti dari Ludfy/Zume. Keputusan siap jual nanti mengikuti QC harian lengkap.</p>
        </div>
      </div>

      <form className="panel formGrid" action={createUnitWithInitialQcAction}>
        {errorMessage ? <div className="infoBox dangerInfo">{errorMessage}</div> : null}
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
          <label>Alur setelah disimpan
            <select name="qcFlowStatus" defaultValue="LANJUT_QC_HARIAN">
              <option value="LANJUT_QC_HARIAN">Langsung lanjut QC harian</option>
              <option value="TAHAN_DULU">Tahan dulu / perlu keputusan</option>
              <option value="CANDIDATE_RETUR">Candidate retur</option>
            </select>
          </label>
          <label>Windows saat masuk
            <select name="windowsVersion" defaultValue="Windows 11">
              <option>Windows 11</option>
              <option>Windows 10</option>
              <option>Belum install OS</option>
              <option>OS bermasalah</option>
            </select>
          </label>
        </div>

        <div className="numberGrid">
          <label>Harga Modal<input name="hargaModal" inputMode="numeric" placeholder="Rp 2.850.000" /></label>
          <label>Harga Jual<input name="hargaJualRekomendasi" inputMode="numeric" placeholder="Rp 3.650.000" required /></label>
        </div>
        <label>Link foto katalog
          <input name="catalogImageUrl" placeholder="Opsional, bisa diisi nanti setelah unit difoto" />
        </label>

        <div className="infoBox compactInfo">
          Lokasi stok, SSD health, battery health, dan keputusan siap jual diisi di QC harian. Unit Intel Gen 8 ke atas wajib Windows 11 sebelum masuk katalog.
        </div>

        <button className="primaryButton" type="submit">Simpan Unit ke Batch</button>
      </form>
    </section>
  );
}
