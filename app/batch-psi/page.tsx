import { CalendarDays, FileClock, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { canEditBatch, canEditUnit } from "@/lib/auth";
import { getBatchesForManagementPage } from "@/lib/batch-page-data";
import { chargerTypes } from "@/lib/charger-options";
import { getCurrentUser } from "@/lib/session";
import { statusTone } from "@/lib/constants";
import { deleteBatchAction, deleteUnitFromBatchAction, markUnitReturnedAction } from "./actions";
import { DeleteBatchButton } from "./DeleteBatchButton";
import { DeleteUnitButton } from "./DeleteUnitButton";

const paymentTone: Record<string, string> = {
  Lunas: "green",
  "Belum jatuh tempo": "yellow",
  "Mendekati tempo": "yellow",
  "Butuh follow up": "red"
};

function sortBatchUnits<T extends { nomorUnit: string; model: string; statusObservasi: string; catalogImageUrl?: string; hargaModal: number }>(units: T[], sort: string) {
  return [...units].sort((a, b) => {
    if (sort === "model") return a.model.localeCompare(b.model, "id", { numeric: true });
    if (sort === "status") return a.statusObservasi.localeCompare(b.statusObservasi, "id", { numeric: true });
    if (sort === "modal") return b.hargaModal - a.hargaModal;
    if (sort === "foto") return Number(Boolean(b.catalogImageUrl)) - Number(Boolean(a.catalogImageUrl));
    if (sort === "ready") {
      const readyA = a.statusObservasi === "VERIFIED" || a.statusObservasi === "VERIFIED WITH NOTES";
      const readyB = b.statusObservasi === "VERIFIED" || b.statusObservasi === "VERIFIED WITH NOTES";
      return Number(readyB) - Number(readyA);
    }
    return a.nomorUnit.localeCompare(b.nomorUnit, "id", { numeric: true });
  });
}

export default async function BatchPsiPage({ searchParams }: { searchParams?: { error?: string; deleted?: string; returned?: string; sort?: string } }) {
  const currentUser = getCurrentUser();
  const canManageBatch = currentUser ? canEditBatch(currentUser) : false;
  const canManageUnit = currentUser ? canEditUnit(currentUser) : false;
  const canDeleteBatch = currentUser?.role === "admin";
  const batches = await getBatchesForManagementPage();
  const activeSort = searchParams?.sort ?? "unit";

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
      {searchParams?.deleted === "batch" ? <div className="successBox">Batch berhasil dihapus.</div> : null}
      {searchParams?.returned === "unit" ? <div className="successBox">Unit ditandai retur distributor dan tidak dihitung sebagai unit dibayar.</div> : null}
      {searchParams?.error === "unit-sold" ? <div className="infoBox dangerInfo">Unit sudah terjual, jadi tidak bisa dihapus dari batch.</div> : null}
      {searchParams?.error === "unit-sale-history" ? <div className="infoBox dangerInfo">Unit punya riwayat transaksi/nota, jadi tidak bisa dihapus. Batalkan transaksi dulu atau biarkan sebagai arsip.</div> : null}
      {searchParams?.error === "unit-related-data" ? <div className="infoBox dangerInfo">Unit masih punya data terkait, jadi belum bisa dihapus aman. Coba tandai retur atau hubungi admin teknis.</div> : null}
      {searchParams?.error === "unit-sold-retur" ? <div className="infoBox dangerInfo">Unit sudah terjual, jadi tidak bisa ditandai retur distributor.</div> : null}
      {searchParams?.error === "batch-confirm" ? <div className="infoBox dangerInfo">Konfirmasi hapus batch gagal. Username login tidak cocok.</div> : null}
      {searchParams?.error === "batch-not-found" ? <div className="infoBox dangerInfo">Batch tidak ditemukan.</div> : null}
      {searchParams?.error === "batch-has-sales" ? <div className="infoBox dangerInfo">Batch punya unit yang sudah terjual atau punya riwayat nota, jadi tidak bisa dihapus.</div> : null}
      {searchParams?.error === "batch-related-data" ? <div className="infoBox dangerInfo">Batch masih punya data terkait, jadi belum bisa dihapus aman.</div> : null}

      <div className="batchManagement">
        {batches.map((batch) => {
          const soldUnits = batch.units.filter((unit) => unit.soldAt);
          const batchUnits = sortBatchUnits(batch.units.filter((unit) => !unit.soldAt), activeSort);
          const totalModal = batchUnits.reduce((sum, unit) => sum + unit.hargaModal, 0);
          const chargerSummary = chargerTypes
            .map((chargerType) => ({ type: chargerType, count: batch.chargerCounts?.[chargerType] ?? 0 }))
            .filter((item) => item.count > 0);
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
                <span><ReceiptText size={16} /> Laptop datang {batch.jumlahLaptopDatang ?? batch.units.length}</span>
                <span><ReceiptText size={16} /> Charger datang {batch.jumlahChargerDatang ?? 0}</span>
                <span><ReceiptText size={16} /> Modal {formatRupiah(totalModal)}</span>
                {soldUnits.length > 0 ? <span><ReceiptText size={16} /> {soldUnits.length} unit terjual disembunyikan</span> : null}
              </div>
              {chargerSummary.length > 0 ? (
                <div className="chargerSummary">
                  {chargerSummary.map((item) => <span key={item.type}>{item.type}: {item.count}</span>)}
                </div>
              ) : null}
              <p className="bodyText">{batch.catatan}</p>

              <div className="batchUnitSortBar">
                <span>Sortir unit</span>
                <Link className={`sortPill ${activeSort === "unit" ? "active" : ""}`} href="/batch-psi?sort=unit">Nomor</Link>
                <Link className={`sortPill ${activeSort === "ready" ? "active" : ""}`} href="/batch-psi?sort=ready">Ready</Link>
                <Link className={`sortPill ${activeSort === "status" ? "active" : ""}`} href="/batch-psi?sort=status">Status</Link>
                <Link className={`sortPill ${activeSort === "foto" ? "active" : ""}`} href="/batch-psi?sort=foto">Foto</Link>
                <Link className={`sortPill ${activeSort === "model" ? "active" : ""}`} href="/batch-psi?sort=model">Model</Link>
                <Link className={`sortPill ${activeSort === "modal" ? "active" : ""}`} href="/batch-psi?sort=modal">Modal</Link>
              </div>

              <div className="tableLike compact">
                {batchUnits.map((unit) => {
                  const isReady = unit.statusObservasi === "VERIFIED" || unit.statusObservasi === "VERIFIED WITH NOTES";
                  const hasPhoto = Boolean(unit.catalogImageUrl);
                  return (
                  <div className={`unitRow ${isReady ? "readyUnitRow" : ""} ${hasPhoto ? "photoUnitRow" : ""}`} key={unit.id}>
                    <span className="unitNumber">{unit.nomorUnit}</span>
                    <span>
                      <Link href={`/unit/${unit.id}`}><strong>{unit.model}</strong></Link>
                      <small>{unit.processor} / {unit.ram} / {unit.ssd}{unit.chargerType ? ` / ${unit.chargerType}` : ""}</small>
                    </span>
                    <div className="unitBadgeStack">
                      <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
                      {isReady ? <span className="statusPill green">Ready jual</span> : null}
                      {hasPhoto ? <span className="statusPill photoPill">Ada foto</span> : null}
                    </div>
                    {canManageUnit ? (
                      <div className="buttonRow noMargin">
                        <Link className="secondaryButton compactButton" href={`/unit/${unit.id}/edit`}>Edit Unit</Link>
                        {unit.statusObservasi !== "RETUR DISTRIBUTOR" ? (
                          <form action={markUnitReturnedAction.bind(null, unit.id)}>
                            <button className="secondaryButton compactButton" type="submit">Retur</button>
                          </form>
                        ) : null}
                        <form action={deleteUnitFromBatchAction.bind(null, unit.id)}>
                          <DeleteUnitButton unitLabel={`Unit ${unit.nomorUnit} - ${unit.model}`} />
                        </form>
                      </div>
                    ) : null}
                  </div>
                );})}
                {batchUnits.length === 0 ? <div className="emptyState">Tidak ada unit aktif di batch ini.</div> : null}
              </div>

              {canManageBatch ? (
                <div className="buttonRow">
                  <Link className="secondaryButton" href={`/batch-psi/${batch.id}/edit`}>Edit Batch</Link>
                  <Link className="secondaryButton" href={`/unit/new?batch=${batch.id}`}>Tambah Unit</Link>
                  <Link className="secondaryButton" href={`/batch-psi/${batch.id}/history`}>Histori QC</Link>
                  <Link className="secondaryButton" href={`/batch-psi/${batch.id}/payment`}>Rekap Pembayaran</Link>
                  <a className="secondaryButton" href={`/api/batch-psi/${batch.id}/export`}>Export Spek CSV</a>
                  {canDeleteBatch && currentUser ? (
                    <form action={deleteBatchAction.bind(null, batch.id)}>
                      <DeleteBatchButton batchLabel={batch.nomorBatch} currentUsername={currentUser.username} unitCount={batchUnits.length} />
                    </form>
                  ) : null}
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
