import { CalendarDays, FileClock, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { canEditBatch, canEditUnit } from "@/lib/auth";
import { getBatchesForManagementPage } from "@/lib/batch-page-data";
import { getCurrentUser } from "@/lib/session";
import { statusTone } from "@/lib/constants";
import { deleteUnitFromBatchAction } from "./actions";

const paymentTone: Record<string, string> = {
  Lunas: "green",
  "Belum jatuh tempo": "yellow",
  "Mendekati tempo": "yellow",
  "Butuh follow up": "red"
};

export default async function BatchPsiPage({ searchParams }: { searchParams?: { error?: string; deleted?: string } }) {
  const currentUser = getCurrentUser();
  const canManageBatch = currentUser ? canEditBatch(currentUser) : false;
  const canManageUnit = currentUser ? canEditUnit(currentUser) : false;
  const batches = await getBatchesForManagementPage();

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Batch</p>
          <h1>Management batch masuk dan tempo pembayaran</h1>
        </div>
        {canManageBatch ? (
          <div className="buttonRow noMargin">
            <Link className="secondaryButton" href="/batch-psi/import">Import Spreadsheet</Link>
            <Link className="primaryButton" href="/batch-psi/new"><Plus size={17} /> Tambah Batch</Link>
          </div>
        ) : (
          <Link className="secondaryButton" href="/login">Login admin/teknisi</Link>
        )}
      </div>

      {searchParams?.deleted === "unit" ? <div className="successBox">Unit berhasil dihapus dari batch.</div> : null}
      {searchParams?.error === "unit-sold" ? <div className="infoBox dangerInfo">Unit sudah terjual, jadi tidak bisa dihapus dari batch.</div> : null}

      <div className="batchManagement">
        {batches.map((batch) => {
          const soldUnits = batch.units.filter((unit) => unit.soldAt);
          const batchUnits = batch.units.filter((unit) => !unit.soldAt);
          const totalModal = batchUnits.reduce((sum, unit) => sum + unit.hargaModal, 0);
          return (
            <article className="panel" key={batch.id}>
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">{batch.nomorBatch}</p>
                  <h2>{batch.supplier}</h2>
                </div>
                <span className={`statusPill ${paymentTone[batch.statusPembayaran] ?? "yellow"}`}>{batch.statusPembayaran}</span>
              </div>

              <div className="batchMeta">
                <span><CalendarDays size={16} /> Masuk {batch.tanggalMasuk}</span>
                <span><FileClock size={16} /> Tempo {batch.tanggalTempo}</span>
                <span><ReceiptText size={16} /> Modal {formatRupiah(totalModal)}</span>
                {soldUnits.length > 0 ? <span><ReceiptText size={16} /> {soldUnits.length} unit terjual disembunyikan</span> : null}
              </div>
              <p className="bodyText">{batch.catatan}</p>

              <div className="tableLike compact">
                {batchUnits.map((unit) => (
                  <div className="unitRow" key={unit.id}>
                    <span className="unitNumber">{unit.nomorUnit}</span>
                    <span>
                      <Link href={`/unit/${unit.id}`}><strong>{unit.model}</strong></Link>
                      <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                    </span>
                    <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
                    {canManageUnit ? (
                      <div className="buttonRow noMargin">
                        <Link className="secondaryButton compactButton" href={`/unit/${unit.id}/edit`}>Edit Unit</Link>
                        <form action={deleteUnitFromBatchAction.bind(null, unit.id)}>
                          <button className="secondaryButton compactButton dangerButton" type="submit">Hapus</button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))}
                {batchUnits.length === 0 ? <div className="emptyState">Tidak ada unit aktif di batch ini.</div> : null}
              </div>

              {canManageBatch ? (
                <div className="buttonRow">
                  <Link className="secondaryButton" href={`/batch-psi/${batch.id}/edit`}>Edit Batch</Link>
                  <Link className="secondaryButton" href={`/unit/new?batch=${batch.id}`}>Tambah Unit</Link>
                  <Link className="secondaryButton" href={`/batch-psi/${batch.id}/history`}>Histori QC</Link>
                  <Link className="secondaryButton" href={`/batch-psi/${batch.id}/payment`}>Rekap Pembayaran</Link>
                  <a className="secondaryButton" href={`/api/batch-psi/${batch.id}/export`}>Export Spek CSV</a>
                </div>
              ) : (
                <div className="infoBox">Login sebagai admin atau teknisi untuk edit batch dan tambah unit.</div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
