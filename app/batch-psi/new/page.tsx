import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { chargerFieldName, chargerTypes } from "@/lib/charger-options";
import { requireRole } from "@/lib/session";
import { createBatchAction } from "../actions";

export default function NewBatchPage({ searchParams }: { searchParams?: { error?: string } }) {
  requireRole(["admin", "teknisi"]);

  return (
    <section className="pageStack narrowPage">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Tambah Batch</p>
          <h1>Input batch PSI baru</h1>
        </div>
      </div>

      {searchParams?.error ? <div className="infoBox dangerInfo">Data batch belum valid. Periksa nomor batch, supplier, dan tanggal.</div> : null}

      <form className="panel formGrid" action={createBatchAction}>
        <label>Nomor Batch<input name="nomorBatch" placeholder="PSI-2026-05-C" required /></label>
        <label>Supplier<input name="supplier" placeholder="PSI Jakarta" required /></label>
        <div className="numberGrid">
          <label>Tanggal Masuk<input name="tanggalMasuk" type="date" required /></label>
          <label>Tanggal Tempo<input name="tanggalTempo" type="date" required /></label>
        </div>
        <div className="numberGrid">
          <label>Jumlah laptop datang<input name="jumlahLaptopDatang" type="number" min="0" placeholder="Contoh: 40" /></label>
          <label>Jumlah charger datang<input name="jumlahChargerDatang" type="number" min="0" placeholder="Contoh: 38" /></label>
        </div>
        <div className="panelSubsection">
          <p className="eyebrow">Rincian jenis charger</p>
          <div className="chargerCountGrid">
            {chargerTypes.map((chargerType) => (
              <label key={chargerType}>{chargerType}<input name={chargerFieldName(chargerType)} type="number" min="0" placeholder="0" /></label>
            ))}
          </div>
        </div>
        <label>Status Pembayaran
          <select name="statusPembayaran" defaultValue="Belum jatuh tempo">
            <option>Belum jatuh tempo</option>
            <option>Mendekati tempo</option>
            <option>Butuh follow up</option>
            <option>Lunas</option>
          </select>
        </label>
        <label>Catatan<textarea name="catatan" placeholder="Catatan batch, fokus pengecekan, atau kesepakatan PSI." /></label>
        <button className="primaryButton" type="submit"><Plus size={17} /> Simpan Batch</button>
      </form>
    </section>
  );
}
