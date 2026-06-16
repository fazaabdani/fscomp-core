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

function includesText(value: unknown, q: string) {
  return String(value ?? "").toLowerCase().includes(q);
}

function batchHref(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const text = query.toString();
  return text ? `/batch-psi?${text}` : "/batch-psi";
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

      <form className="panel formGrid" action="/batch-psi">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Filter batch</p>
            <h2>Cari batch atau unit</h2>
          </div>
          <Search size={22} />
        </div>
        <input type="hidden" name="sort" value={activeSort} />
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
          const batchUnits = sortBatchUnits(filteredUnits, activeSort);
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
                <Link className={`sortPill ${activeSort === "unit" ? "active" : ""}`} href={batchHref({ sort: "unit", q: searchParams?.q ?? "", status: statusFilter })}>Nomor</Link>
                <Link className={`sortPill ${activeSort === "ready" ? "active" : ""}`} href={batchHref({ sort: "ready", q: searchParams?.q ?? "", status: statusFilter })}>Ready</Link>
                <Link className={`sortPill ${activeSort === "status" ? "active" : ""}`} href={batchHref({ sort: "status", q: searchParams?.q ?? "", status: statusFilter })}>Status</Link>
                <Link className={`sortPill ${activeSort === "foto" ? "active" : ""}`} href={batchHref({ sort: "foto", q: searchParams?.q ?? "", status: statusFilter })}>Foto</Link>
                <Link className={`sortPill ${activeSort === "model" ? "active" : ""}`} href={batchHref({ sort: "model", q: searchParams?.q ?? "", status: statusFilter })}>Model</Link>
                <Link className={`sortPill ${activeSort === "modal" ? "active" : ""}`} href={batchHref({ sort: "modal", q: searchParams?.q ?? "", status: statusFilter })}>Modal</Link>
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
