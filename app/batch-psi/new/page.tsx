import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { requireRole } from "@/lib/session";
import { createBatchAction } from "../actions";

export default function NewBatchPage() {
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

      <form className="panel formGrid" action={createBatchAction}>
        <label>Nomor Batch<input name="nomorBatch" placeholder="PSI-2026-05-C" required /></label>
        <label>Supplier<input name="supplier" placeholder="PSI Jakarta" required /></label>
        <div className="numberGrid">
          <label>Tanggal Masuk<input name="tanggalMasuk" type="date" required /></label>
          <label>Tanggal Tempo<input name="tanggalTempo" type="date" required /></label>
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
