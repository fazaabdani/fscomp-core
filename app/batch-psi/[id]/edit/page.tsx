import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBatchForEdit } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { updateBatchAction } from "../../actions";

export default async function EditBatchPage({ params }: { params: { id: string } }) {
  requireRole(["admin", "teknisi"]);
  const batch = await getBatchForEdit(params.id);
  if (!batch) notFound();
  const action = updateBatchAction.bind(null, batch.id);

  return (
    <section className="pageStack narrowPage">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Edit Batch</p>
          <h1>{batch.nomorBatch}</h1>
        </div>
      </div>

      <form className="panel formGrid" action={action}>
        <label>Nomor Batch<input name="nomorBatch" defaultValue={batch.nomorBatch} required /></label>
        <label>Supplier<input name="supplier" defaultValue={batch.supplier} required /></label>
        <div className="numberGrid">
          <label>Tanggal Masuk<input name="tanggalMasuk" type="date" defaultValue={batch.tanggalMasuk} required /></label>
          <label>Tanggal Tempo<input name="tanggalTempo" type="date" defaultValue={batch.tanggalTempo} required /></label>
        </div>
        <label>Status Pembayaran
          <select name="statusPembayaran" defaultValue={batch.statusPembayaran}>
            <option>Belum jatuh tempo</option>
            <option>Mendekati tempo</option>
            <option>Butuh follow up</option>
            <option>Lunas</option>
          </select>
        </label>
        <label>Catatan<textarea name="catatan" defaultValue={batch.catatan} /></label>
        <button className="primaryButton" type="submit">Simpan Perubahan</button>
      </form>
    </section>
  );
}
