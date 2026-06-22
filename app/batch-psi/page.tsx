import { CalendarDays, FileClock, Plus, ReceiptText, Search } from "lucide-react";
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
import { BatchUnitSorter } from "./BatchUnitSorter";
import { FlashNotice } from "../FlashNotice";

const paymentTone: Record<string, string> = {
  Lunas: "green",
  "Belum jatuh tempo": "yellow",
  "Mendekati tempo": "yellow",
  "Butuh follow up": "red"
};

function includesText(value: unknown, q: string) {
  return String(value ?? "").toLowerCase().includes(q);
}

export default async function BatchPsiPage({ searchParams }: { searchParams?: { error?: string; deleted?: string; returned?: string; sort?: string; q?: string; status?: string } }) {
  const currentUser = getCurrentUser();
  const canManageBatch = currentUser ? canEditBatch(currentUser) : false;
  const canManageUnit = currentUser ? canEditUnit(currentUser) : false;
  const canDeleteBatch = currentUser?.role === "admin";
  const batches = await getBatchesForManagementPage();
  const activeSort = searchParams?.sort ?? "unit";
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const statusFilter = searchParams?.status ?? "semua";
  const flashMessage = searchParams?.deleted === "unit"
    ? "Unit berhasil dihapus dari batch."
    : searchParams?.deleted === "batch"
      ? "Batch berhasil dihapus."
      : searchParams?.returned === "unit"
        ? "Unit ditandai retur distributor dan tidak dihitung sebagai unit dibayar."
        : searchParams?.error === "unit-sold"
          ? "Unit sudah terjual, jadi tidak bisa dihapus dari batch."
          : searchParams?.error === "unit-sale-history"
            ? "Unit punya riwayat transaksi/nota dan tidak bisa dihapus."
            : searchParams?.error === "unit-related-data"
              ? "Unit masih punya data terkait. Tandai retur atau hubungi admin teknis."
              : searchParams?.error === "unit-sold-retur"
                ? "Unit sudah terjual dan tidak bisa ditandai retur distributor."
                : searchParams?.error === "batch-confirm"
                  ? "Konfirmasi hapus batch gagal. Username login tidak cocok."
                  : searchParams?.error === "batch-not-found"
                    ? "Batch tidak ditemukan."
                    : searchParams?.error === "batch-has-sales"
                      ? "Batch memiliki unit terjual atau riwayat nota dan tidak bisa dihapus."
                      : searchParams?.error === "batch-related-data"
                        ? "Batch masih punya data terkait dan belum bisa dihapus aman."
                        : "";

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

      <FlashNotice message={flashMessage} tone={searchParams?.error ? "error" : "success"} queryKeys={["error", "deleted", "returned"]} />

      <form className="panel formGrid" action="/batch-psi">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Filter batch</p>
            <h2>Cari batch atau unit</h2>
          </div>
          <Search size={22} />
        </div>
        <div className="numberGrid">
          <label>Cari
            <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Nomor batch, supplier, unit, model, spek, charger" />
          </label>
          <label>Status unit
            <select name="status" defaultValue={statusFilter}>
              <option value="semua">Semua status</option>
              <option value="VERIFIED">Verified</option>
              <option value="VERIFIED WITH NOTES">Verified with notes</option>
              <option value="RECHECK">Recheck</option>
              <option value="CANDIDATE RETUR">Candidate retur</option>
              <option value="RETUR DISTRIBUTOR">Retur distributor</option>
            </select>
          </label>
        </div>
        <div className="buttonRow noMargin">
          <button className="secondaryButton" type="submit">Terapkan Filter</button>
          <Link className="secondaryButton" href="/batch-psi">Reset</Link>
        </div>
      </form>

      <div className="batchManagement">
        {batches.map((batch) => {
          const soldUnits = batch.units.filter((unit) => unit.soldAt);
          const matchesBatch = q
            ? [batch.nomorBatch, batch.supplier, batch.tanggalMasuk, batch.tanggalTempo, batch.statusPembayaran, batch.catatan].some((value) => includesText(value, q))
            : true;
          const filteredUnits = batch.units.filter((unit) => {
            if (unit.soldAt) return false;
            if (statusFilter !== "semua" && unit.statusObservasi !== statusFilter) return false;
            if (!q || matchesBatch) return true;
            return [unit.nomorUnit, unit.model, unit.processor, unit.ram, unit.ssd, unit.chargerType, unit.statusObservasi].some((value) => includesText(value, q));
          });
          if ((q || statusFilter !== "semua") && filteredUnits.length === 0) return null;
          const batchUnits = filteredUnits;
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

              <BatchUnitSorter initialSort={activeSort} units={batchUnits.map((unit) => {
                  const isReady = unit.statusObservasi === "VERIFIED" || unit.statusObservasi === "VERIFIED WITH NOTES";
                  const hasPhoto = Boolean(unit.catalogImageUrl);
                  return {
                    id: unit.id,
                    nomorUnit: unit.nomorUnit,
                    model: unit.model,
                    statusObservasi: unit.statusObservasi,
                    catalogImageUrl: unit.catalogImageUrl,
                    hargaModal: unit.hargaModal,
                    content: (
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
                            <button className="secondaryButton compactButton dangerButton" type="submit">Retur</button>
                          </form>
                        ) : null}
                        <form action={deleteUnitFromBatchAction.bind(null, unit.id)}>
                          <DeleteUnitButton unitLabel={`Unit ${unit.nomorUnit} - ${unit.model}`} />
                        </form>
                      </div>
                    ) : null}
                  </div>
                    )
                  };
                })} />

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
