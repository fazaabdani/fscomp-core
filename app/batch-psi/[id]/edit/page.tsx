import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBatch } from "@/lib/api";

export default function EditBatchPage({ params }: { params: { id: string } }) {
  const batch = getBatch(params.id);
  if (!batch) notFound();

  return (
    <section className="pageStack narrowPage">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Edit Batch</p>
          <h1>{batch.nomorBatch}</h1>
        </div>
      </div>

      <form className="panel formGrid">
        <label>Nomor Batch<input defaultValue={batch.nomorBatch} /></label>
        <label>Supplier<input defaultValue={batch.supplier} /></label>
        <div className="numberGrid">
          <label>Tanggal Masuk<input type="date" defaultValue={batch.tanggalMasuk} /></label>
          <label>Tanggal Tempo<input type="date" defaultValue={batch.tanggalTempo} /></label>
        </div>
        <label>Status Pembayaran
          <select defaultValue={batch.statusPembayaran}>
            <option>Belum jatuh tempo</option>
            <option>Mendekati tempo</option>
            <option>Butuh follow up</option>
            <option>Lunas</option>
          </select>
        </label>
        <label>Catatan<textarea defaultValue={batch.catatan} /></label>
        <button className="primaryButton" type="button">Simpan Perubahan</button>
      </form>
    </section>
  );
}
