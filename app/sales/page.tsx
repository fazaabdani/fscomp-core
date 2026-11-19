import { MapPin, Receipt, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getSalesPageData } from "@/lib/sales-page-data";
import { requireRole } from "@/lib/session";
import { MARKETPLACES, paymentStatus } from "@/lib/sale-payments";
import { SubmitButton } from "../SubmitButton";
import { createSaleAction, restoreSaleAction, voidSaleAction } from "./actions";
import { RestoreSaleButton } from "./RestoreSaleButton";
import { VoidSaleButton } from "./VoidSaleButton";
import { NotaKasir } from "./NotaKasir";
import { storeByLocation } from "@/lib/sale-receipt-data";
import { FlashNotice } from "../FlashNotice";
import "./kasir.css";

export const dynamic = "force-dynamic";

function includesText(value: unknown, q: string) {
  return String(value ?? "").toLowerCase().includes(q);
}

function salesHref(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const text = query.toString();
  return text ? `/sales?${text}` : "/sales";
}

export default async function SalesPage({ searchParams }: { searchParams?: { saved?: string; error?: string; voided?: string; restored?: string; sort?: string; q?: string; lokasi?: string; status?: string; detail?: string } }) {
  const currentUser = await requireRole(["admin", "teknisi", "sales"]);
  const { readyUnits, sales, stats, salesReady, blockedByDailyQc } = await getSalesPageData();
  const sort = searchParams?.sort ?? "terbaru";
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const lokasi = searchParams?.lokasi ?? "semua";
  const status = searchParams?.status ?? "semua";
  const filteredSales = sales.filter((sale) => {
    if (lokasi !== "semua" && sale.location.toLowerCase() !== lokasi) return false;
    if (status === "aktif" && sale.voidedAt) return false;
    if (status === "batal" && !sale.voidedAt) return false;
    if (!q) return true;
    return [
      sale.invoiceNumber,
      sale.nomorUnit,
      sale.model,
      sale.location,
      sale.paymentMethod,
      sale.buyerName,
      sale.notes,
      sale.voidReason,
      sale.soldAt
    ].some((value) => includesText(value, q));
  });
  const filteredReadyUnits = readyUnits.filter((unit) => {
    if (lokasi !== "semua" && unit.stockLocation.toLowerCase() !== lokasi) return false;
    if (!q) return true;
    return [unit.nomorUnit, unit.model, unit.processor, unit.ram, unit.ssd, unit.stockLocation].some((value) => includesText(value, q));
  });
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (sort === "lama") return a.soldAt.localeCompare(b.soldAt);
    if (sort === "terbesar") return b.soldPrice - a.soldPrice;
    if (sort === "batal") return Number(Boolean(b.voidedAt)) - Number(Boolean(a.voidedAt));
    return b.soldAt.localeCompare(a.soldAt);
  });
  const flashMessage = searchParams?.saved
    ? "Transaksi berhasil disimpan."
    : searchParams?.voided
      ? "Transaksi dibatalkan. Unit kembali ke stok siap jual."
      : searchParams?.restored
        ? "Transaksi aktif kembali dan unit ditandai terjual."
        : searchParams?.error === "modal-kosong"
          ? `Modal belum diisi untuk: ${searchParams.detail ?? "item berbayar"}. Isi kolom Modal/pcs, atau centang "Modal memang Rp 0" kalau barangnya gratis.`
          : searchParams?.error
            ? `Transaksi gagal: ${searchParams.error}`
            : "";

  const filterActive = Boolean(q || lokasi !== "semua" || status !== "semua");
  const isAdmin = currentUser.role === "admin";
  const todayLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <section className="pageStack kasirPage">
      <div className="kasirHead">
        <div>
          <p className="eyebrow">Penjualan dan Kasir</p>
          <h1>Kasir laptop</h1>
        </div>
        <div className="kasirHeadStats">
          <span className="kasirStat"><Receipt size={16} /> Siap jual <strong>{stats.readyCount}</strong></span>
          <span className="kasirStat"><ShoppingCart size={16} /> Transaksi <strong>{stats.soldCount}</strong></span>
        </div>
        <div className="kasirHeadLinks">
          <Link className="secondaryButton" href="/sales/non-laptop">Kasir Non-Laptop</Link>
          {isAdmin ? <Link className="secondaryButton" href="/sales/piutang">Piutang</Link> : null}
          {isAdmin ? <Link className="secondaryButton" href="/finance">Rekap keuangan</Link> : null}
        </div>
      </div>

      {!salesReady ? (
        <div className="infoBox dangerInfo">
          Tabel penjualan belum aktif di database. Jalankan <strong>npm run db:migrate</strong> di terminal app Coolify, lalu restart/redeploy.
        </div>
      ) : null}
      {blockedByDailyQc > 0 ? (
        <div className="infoBox">{blockedByDailyQc} unit tidak dimunculkan di stok siap jual karena QC harian terakhir tidak lolos hardware.</div>
      ) : null}
      <FlashNotice message={flashMessage} tone={searchParams?.error ? "error" : "success"} queryKeys={["saved", "voided", "restored", "error", "detail"]} />

      <div className="kasirLayout">
        <form className="kasirForm" action={createSaleAction}>
          <NotaKasir units={readyUnits} marketplaces={MARKETPLACES} stores={storeByLocation} todayLabel={todayLabel} />
        </form>

        <aside className="kasirAside">
          <div className="kasirAsideHead">
            <h2><MapPin size={17} /> Stok siap jual</h2>
            <span>{filteredReadyUnits.length} unit</span>
          </div>
          <div className="kasirStock">
            {filteredReadyUnits.length === 0 ? <div className="emptyState">Belum ada stok siap jual yang cocok.</div> : filteredReadyUnits.slice(0, 30).map((unit) => (
              <Link className="kasirStockRow" href={`/unit/${unit.id}`} key={unit.id}>
                <span className="unitNumber">{unit.nomorUnit}</span>
                <span>
                  <strong>{unit.model}</strong>
                  <small>{unit.processor} / {unit.ram} / {unit.ssd} / {unit.stockLocation}</small>
                </span>
                <b>{formatRupiah(unit.hargaJualRekomendasi)}</b>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <section className="panel kasirHistory">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat transaksi</p>
            <h2>Penjualan terbaru</h2>
          </div>
        </div>
        <form className="kasirFilter" action="/sales">
          <input type="hidden" name="sort" value={sort} />
          <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Cari invoice, unit, model, pembeli..." aria-label="Cari transaksi" />
          <select name="lokasi" defaultValue={lokasi} aria-label="Lokasi">
            <option value="semua">Semua lokasi</option>
            <option value="wiradesa">Wiradesa</option>
            <option value="kajen">Kajen</option>
          </select>
          <select name="status" defaultValue={status} aria-label="Status transaksi">
            <option value="semua">Semua status</option>
            <option value="aktif">Aktif saja</option>
            <option value="batal">Batal saja</option>
          </select>
          <button className="primaryButton" type="submit">Cari</button>
          {filterActive ? <Link className="secondaryButton" href="/sales">Reset</Link> : null}
        </form>
        <div className="salesControlBar">
          <div>
            <strong>{filteredSales.length}</strong>
            <span>dari {sales.length} transaksi</span>
          </div>
          <Link className={`sortPill ${sort === "terbaru" ? "active" : ""}`} href={salesHref({ sort: "terbaru", q: searchParams?.q ?? "", lokasi, status })}>Terbaru</Link>
          <Link className={`sortPill ${sort === "lama" ? "active" : ""}`} href={salesHref({ sort: "lama", q: searchParams?.q ?? "", lokasi, status })}>Terlama</Link>
          <Link className={`sortPill ${sort === "terbesar" ? "active" : ""}`} href={salesHref({ sort: "terbesar", q: searchParams?.q ?? "", lokasi, status })}>Nominal besar</Link>
          <Link className={`sortPill ${sort === "batal" ? "active" : ""}`} href={salesHref({ sort: "batal", q: searchParams?.q ?? "", lokasi, status })}>Batal</Link>
        </div>
        <div className="paymentRows transactionScroll">
          {sortedSales.length === 0 ? <div className="emptyState">Belum ada transaksi.</div> : sortedSales.map((sale) => (
            <div className={`paymentRow saleRow ${sale.voidedAt ? "voidedSaleRow" : ""}`} key={sale.id}>
              <span>{sale.invoiceNumber}</span>
              <div>
                <Link href={`/sales/${sale.id}/receipt`}><strong>Unit {sale.nomorUnit} - {sale.model}</strong></Link>
                <small>{sale.soldAt} / {sale.location} / {sale.paymentMethod} / {sale.buyerName} / {sale.itemCount} item {sale.voidedAt ? `/ BATAL: ${sale.voidReason}` : ""}</small>
                {!sale.voidedAt ? (
                  <small>
                    {paymentStatus(sale).settled ? "Lunas" : `Dibayar ${formatRupiah(sale.dpAmount)}, sisa ${formatRupiah(paymentStatus(sale).remaining)}`}
                    {currentUser.role === "admin" ? ` / Laba ${formatRupiah(sale.grossProfit)}` : ""}
                    {currentUser.role === "admin" && sale.marketplaceFee > 0 ? ` / Potongan ${sale.marketplaceName || "admin"} ${formatRupiah(sale.marketplaceFee)}` : ""}
                  </small>
                ) : null}
              </div>
              <b>{formatRupiah(sale.soldPrice)}</b>
              {sale.voidedAt ? (
                <span className="statusPill red">Batal</span>
              ) : paymentStatus(sale).settled ? (
                <span className="statusPill green">Lunas</span>
              ) : (
                <span className="statusPill yellow">Belum lunas</span>
              )}
              <Link className="secondaryButton compactButton" href={`/sales/${sale.id}/receipt`}>Nota / Cetak ulang</Link>
              {currentUser.role === "admin" && !sale.voidedAt ? (
                <form action={voidSaleAction.bind(null, sale.id)} className="voidSaleForm">
                  <input type="hidden" name="voidReason" value="Transaksi batal dari kasir" />
                  <VoidSaleButton saleLabel={`${sale.invoiceNumber} / Unit ${sale.nomorUnit} - ${sale.model}`} compact />
                </form>
              ) : null}
              {currentUser.role === "admin" && sale.voidedAt ? (
                <form action={restoreSaleAction.bind(null, sale.id)} className="voidSaleForm">
                  <RestoreSaleButton saleLabel={`${sale.invoiceNumber} / Unit ${sale.nomorUnit} - ${sale.model}`} compact />
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
