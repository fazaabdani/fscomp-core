import { Archive, ArrowLeft, ChevronLeft, ChevronRight, Receipt, Search, TrendingUp, WalletCards } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getSalesArchiveData, type SalesArchiveFilters } from "@/lib/sales-archive-data";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

function archiveHref(filters: SalesArchiveFilters, page: number) {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (filters.location) query.set("location", filters.location);
  if (filters.status) query.set("status", filters.status);
  query.set("page", String(page));
  return `/sales/archive?${query.toString()}`;
}

export default async function SalesArchivePage({ searchParams }: { searchParams?: SalesArchiveFilters }) {
  await requireRole(["admin"]);
  const filters: SalesArchiveFilters = {
    ...searchParams,
    status: searchParams?.status ?? "active"
  };
  const { rows, summary, pagination } = await getSalesArchiveData(filters);

  return (
    <section className="pageStack salesArchivePage">
      <div className="sectionTitle">
        <div>
          <Link className="backLink" href="/sales"><ArrowLeft size={16} /> Kembali ke Penjualan</Link>
          <p className="eyebrow">Arsip Penjualan</p>
          <h1>Buka kembali data transaksi lama</h1>
          <p className="bodyText">Data read-only. Harga modal memakai snapshot saat transaksi dibuat dan tidak mengubah stok maupun transaksi lama.</p>
        </div>
        <Archive size={34} />
      </div>

      <div className="statsGrid archiveStatsGrid">
        <div className="metric metric-blue"><Receipt size={20} /><span>Transaksi aktif</span><strong>{summary.activeCount}</strong></div>
        <div className="metric metric-blue"><WalletCards size={20} /><span>Total modal</span><strong>{formatRupiah(summary.totalCost)}</strong></div>
        <div className="metric metric-cyan"><Receipt size={20} /><span>Total penjualan</span><strong>{formatRupiah(summary.soldPrice)}</strong></div>
        <div className="metric metric-green"><TrendingUp size={20} /><span>Profit kotor</span><strong>{formatRupiah(summary.grossProfit)}</strong></div>
      </div>

      <form className="panel archiveFilter" action="/sales/archive">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Pencarian arsip</p>
            <h2>Cari seluruh transaksi</h2>
          </div>
          <Search size={22} />
        </div>
        <label className="archiveSearchField">Cari invoice, unit, model, pembeli, atau nomor WA
          <input name="q" defaultValue={filters.q ?? ""} placeholder="Contoh: FS-2026, T480, Faza, 0812..." />
        </label>
        <div className="archiveFilterGrid">
          <label>Dari tanggal<input name="from" type="date" defaultValue={filters.from ?? ""} /></label>
          <label>Sampai tanggal<input name="to" type="date" defaultValue={filters.to ?? ""} /></label>
          <label>Cabang
            <select name="location" defaultValue={filters.location ?? "all"}>
              <option value="all">Semua cabang</option>
              <option value="WIRADESA">Wiradesa</option>
              <option value="KAJEN">Kajen</option>
            </select>
          </label>
          <label>Status
            <select name="status" defaultValue={filters.status ?? "active"}>
              <option value="active">Aktif</option>
              <option value="all">Semua</option>
              <option value="voided">Batal</option>
            </select>
          </label>
        </div>
        <div className="buttonRow noMargin">
          <button className="primaryButton" type="submit">Cari Arsip</button>
          <Link className="secondaryButton" href="/sales/archive">Reset</Link>
        </div>
      </form>

      <section className="panel archiveResultsPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Hasil pencarian</p>
            <h2>{pagination.total} transaksi ditemukan</h2>
          </div>
          <span className="statusPill green">Halaman {pagination.page} / {pagination.totalPages}</span>
        </div>

        <div className="archiveTableScroll">
          <div className="archiveTable">
            <div className="archiveTableHeader">
              <span>Invoice / Tanggal</span>
              <span>Unit</span>
              <span>Modal Laptop</span>
              <span>Total Modal</span>
              <span>Harga Jual</span>
              <span>Profit</span>
              <span>Info</span>
              <span>Aksi</span>
            </div>
            {rows.length === 0 ? <div className="emptyState">Tidak ada transaksi yang cocok dengan filter.</div> : rows.map((sale) => (
              <article className={`archiveTableRow ${sale.voidedAt ? "voidedSaleRow" : ""}`} key={sale.id}>
                <div data-label="Invoice / Tanggal"><strong>{sale.invoiceNumber}</strong><small>{sale.soldAt}</small></div>
                <div data-label="Unit"><strong>Unit {sale.nomorUnit} - {sale.model}</strong><small>{sale.specification}</small><small>{sale.buyerName}</small></div>
                <div data-label="Modal Laptop"><strong>{formatRupiah(sale.laptopCost)}</strong><small>{sale.laptopCostSource}</small></div>
                <div data-label="Total Modal"><strong>{formatRupiah(sale.totalCost)}</strong></div>
                <div data-label="Harga Jual"><strong>{formatRupiah(sale.soldPrice)}</strong></div>
                <div data-label="Profit"><strong className={sale.grossProfit >= 0 ? "archiveProfit" : "archiveLoss"}>{formatRupiah(sale.grossProfit)}</strong></div>
                <div data-label="Info"><strong>{sale.location}</strong><small>{sale.paymentMethod}</small>{sale.voidedAt ? <span className="statusPill red">Batal {sale.voidedAt}</span> : <span className="statusPill green">Aktif</span>}</div>
                <div data-label="Aksi"><Link className="secondaryButton compactButton" href={`/sales/${sale.id}/receipt`}>Nota</Link></div>
              </article>
            ))}
          </div>
        </div>

        <div className="archivePagination">
          {pagination.page > 1 ? <Link className="secondaryButton" href={archiveHref(filters, pagination.page - 1)}><ChevronLeft size={16} /> Sebelumnya</Link> : <span />}
          <span>Menampilkan maksimal {pagination.pageSize} data per halaman</span>
          {pagination.page < pagination.totalPages ? <Link className="secondaryButton" href={archiveHref(filters, pagination.page + 1)}>Berikutnya <ChevronRight size={16} /></Link> : <span />}
        </div>
      </section>
    </section>
  );
}
