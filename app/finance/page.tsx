import { Banknote, Download, Receipt, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getFinancePageData } from "@/lib/finance-page-data";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

function reportUrl(from?: string, to?: string, jenis?: string) {
  const params = new URLSearchParams();
  if (jenis) params.set("jenis", jenis);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();
  return query ? `/api/finance/report?${query}` : "/api/finance/report";
}

function todayJakartaDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function FinancePage({ searchParams }: { searchParams?: { from?: string; to?: string; jenis?: string } }) {
  await requireRole(["admin"]);
  const from = searchParams?.from ?? "";
  const to = searchParams?.to ?? "";
  const jenis = searchParams?.jenis === "laptop" || searchParams?.jenis === "nonlaptop" ? searchParams.jenis : "";
  const { stats, laptopStats, nonLaptopStats, sales } = await getFinancePageData({ from, to, jenis });
  const tabHref = (value: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (value) params.set("jenis", value);
    const query = params.toString();
    return query ? `/finance?${query}` : "/finance";
  };
  const jenisLabel = jenis === "laptop" ? "Laptop" : jenis === "nonlaptop" ? "PC & non-laptop" : "Semua penjualan";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Keuangan</p>
          <h1>Laporan omzet, modal, dan estimasi profit kotor</h1>
          <p className="bodyText">Transaksi batal tidak dihitung. Estimasi profit kotor belum termasuk biaya retur, servis, operasional, dan overhead.</p>
        </div>
        <Link className="primaryButton" href={reportUrl(from, to, jenis)}><Download size={17} /> Tarik Laporan CSV</Link>
      </div>

      <form className="panel formGrid" action="/finance">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Filter tanggal</p>
            <h2>Periode laporan finance</h2>
          </div>
        </div>
        <div className="numberGrid">
          <label>Dari tanggal
            <input type="date" name="from" defaultValue={from || todayJakartaDateString()} />
          </label>
          <label>Sampai tanggal
            <input type="date" name="to" defaultValue={to || todayJakartaDateString()} />
          </label>
        </div>
        <div className="buttonRow noMargin">
          <button className="secondaryButton" type="submit">Terapkan Filter</button>
          <Link className="secondaryButton" href="/finance">Reset Semua</Link>
          <Link className="primaryButton" href={reportUrl(from, to, jenis)}><Download size={16} /> Export Periode Ini</Link>
          <Link className="secondaryButton" href="/api/admin/backup"><Download size={16} /> Backup Database JSON</Link>
        </div>
      </form>

      <div className="buttonRow noMargin">
        <Link className={jenis === "" ? "primaryButton" : "secondaryButton"} href={tabHref("")}>Semua</Link>
        <Link className={jenis === "laptop" ? "primaryButton" : "secondaryButton"} href={tabHref("laptop")}>Laptop</Link>
        <Link className={jenis === "nonlaptop" ? "primaryButton" : "secondaryButton"} href={tabHref("nonlaptop")}>PC & non-laptop</Link>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Ringkasan terpisah</p>
            <h2>Laptop vs PC & non-laptop</h2>
          </div>
        </div>
        <div className="paymentRows">
          {[{ label: "Laptop", s: laptopStats }, { label: "PC & non-laptop", s: nonLaptopStats }].map(({ label, s }) => (
            <div className="paymentRow financeRow" key={label}>
              <strong>{label}</strong>
              <div><small>{s.totalTransaksi} transaksi</small></div>
              <b>Omzet {formatRupiah(s.totalOmzet)}</b>
              <span>Modal {formatRupiah(s.totalModal)}</span>
              <span className={s.totalProfit >= 0 ? "profitText" : "lossText"}>Profit {formatRupiah(s.totalProfit)}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="bodyText">Angka di bawah untuk: <strong>{jenisLabel}</strong>.</p>
      <div className="financeStatsGrid">
        <div className="metric metric-cyan metric-highlight"><Banknote size={20} /><span>Omzet</span><strong>{formatRupiah(stats.totalOmzet)}</strong></div>
        <div className="metric metric-green metric-highlight"><TrendingUp size={20} /><span>Estimasi profit kotor</span><strong>{formatRupiah(stats.totalProfit)}</strong></div>
        <div className="metric metric-blue"><Receipt size={20} /><span>Total modal</span><strong>{formatRupiah(stats.totalModal)}</strong></div>
        <div className="metric metric-blue"><Receipt size={20} /><span>Transaksi aktif</span><strong>{stats.totalTransaksi}</strong></div>
        <div className="metric metric-blue"><Receipt size={20} /><span>Estimasi bagian Wiradesa</span><strong>{formatRupiah(stats.totalWiradesaShare)}</strong></div>
        <div className="metric metric-green"><TrendingUp size={20} /><span>Estimasi bagian Kajen</span><strong>{formatRupiah(stats.totalKajenShare)}</strong></div>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat keuangan</p>
            <h2>Transaksi aktif</h2>
          </div>
        </div>
        <div className="paymentRows">
          {sales.length === 0 ? <div className="emptyState">Belum ada transaksi aktif.</div> : sales.map((sale) => (
            <Link className="paymentRow financeRow" href={`/sales/${sale.id}/receipt`} key={sale.id}>
              <span>{sale.invoiceNumber}</span>
              <div>
                <strong>{sale.kind === "Laptop" ? `Unit ${sale.unitNomor} - ${sale.model}` : `${sale.kind}: ${sale.model}`}</strong>
                <small>{sale.soldAt} / {sale.location} / {sale.paymentMethod} / {sale.itemCount} item</small>
              </div>
              <b>{formatRupiah(sale.soldPrice)}</b>
              <span>{formatRupiah(sale.costPrice)}</span>
              <span className={sale.grossProfit >= 0 ? "profitText" : "lossText"}>{formatRupiah(sale.grossProfit)}</span>
              {sale.location === "Kajen" ? <small>Kajen {formatRupiah(sale.kajenShare)} / Wiradesa {formatRupiah(sale.wiradesaShare)}</small> : null}
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
