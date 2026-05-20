import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

export default function NewBatchPage() {
  return (
    <section className="pageStack narrowPage">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Tambah Batch</p>
          <h1>Input batch PSI baru</h1>
        </div>
      </div>

      <form className="panel formGrid">
        <label>Nomor Batch<input placeholder="PSI-2026-05-C" /></label>
        <label>Supplier<input placeholder="PSI Jakarta" /></label>
        <div className="numberGrid">
          <label>Tanggal Masuk<input type="date" /></label>
          <label>Tanggal Tempo<input type="date" /></label>
        </div>
        <label>Status Pembayaran
          <select defaultValue="Belum jatuh tempo">
            <option>Belum jatuh tempo</option>
            <option>Mendekati tempo</option>
            <option>Butuh follow up</option>
            <option>Lunas</option>
          </select>
        </label>
        <label>Catatan<textarea placeholder="Catatan batch, fokus pengecekan, atau kesepakatan PSI." /></label>
        <button className="primaryButton" type="button"><Plus size={17} /> Simpan Batch</button>
      </form>
    </section>
  );
}
