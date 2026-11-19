import { Banknote, Download, Receipt, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getFinancePageData } from "@/lib/finance-page-data";
import { requireRole } from "@/lib/session";
import "../kelola-sparepart/sparepart.css";

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

function shiftDays(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const FINANCE_STEP = 30;

export default async function FinancePage({ searchParams }: { searchParams?: { from?: string; to?: string; jenis?: string; lim?: string } }) {
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
  const today = todayJakartaDateString();
  const limit = Math.max(FINANCE_STEP, Number(searchParams?.lim) || FINANCE_STEP);
  const presets = [
    { label: "Hari ini", from: today, to: today },
    { label: "7 hari", from: shiftDays(today, -6), to: today },
    { label: "Bulan ini", from: `${today.slice(0, 8)}01`, to: today }
  ];
  const rangeHref = (f: string, t: string) => {
    const params = new URLSearchParams({ from: f, to: t });
    if (jenis) params.set("jenis", jenis);
    return `/finance?${params.toString()}`;
  };
  const moreHref = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (jenis) params.set("jenis", jenis);
    params.set("lim", String(limit + FINANCE_STEP));
    return `/finance?${params.toString()}`;
  };
  const jenisLabel = jenis === "laptop" ? "Laptop" : jenis === "nonlaptop" ? "PC & non-laptop" : "Semua penjualan";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Keuangan</p>
          <h1>Omzet, modal, dan profit kotor</h1>
          <p className="bodyText">Transaksi batal tidak dihitung. Profit kotor belum termasuk retur, servis, operasional, dan overhead.</p>
        </div>
        <div className="buttonRow noMargin">
          <Link className="secondaryButton" href="/api/admin/backup"><Download size={16} /> Backup database</Link>
          <Link className="primaryButton" href={reportUrl(from, to, jenis)}><Download size={17} /> Unduh CSV periode ini</Link>
        </div>
      </div>

      <form className="spSearch" action="/finance">
        <label className="finDate">Dari<input type="date" name="from" defaultValue={from || today} /></label>
        <label className="finDate">Sampai<input type="date" name="to" defaultValue={to || today} /></label>
        {jenis ? <input type="hidden" name="jenis" value={jenis} /> : null}
        <button className="primaryButton" type="submit">Terapkan</button>
        <Link className="secondaryButton" href="/finance">Reset</Link>
      </form>

      <div className="spChips">
        {presets.map((preset) => (
          <Link key={preset.label} className={`spChip ${from === preset.from && to === preset.to ? "on" : ""}`} href={rangeHref(preset.from, preset.to)}>{preset.label}</Link>
        ))}
        <span className="finSep" aria-hidden="true" />
        <Link className={`spChip ${jenis === "" ? "on" : ""}`} href={tabHref("")}>Semua</Link>
        <Link className={`spChip ${jenis === "laptop" ? "on" : ""}`} href={tabHref("laptop")}>Laptop <small>{laptopStats.totalTransaksi}</small></Link>
        <Link className={`spChip ${jenis === "nonlaptop" ? "on" : ""}`} href={tabHref("nonlaptop")}>PC & non-laptop <small>{nonLaptopStats.totalTransaksi}</small></Link>
      </div>

      <p className="dashHint" style={{ margin: 0 }}>Angka untuk: <strong>{jenisLabel}</strong>{from || to ? ` · ${from || "awal"} sampai ${to || "sekarang"}` : ""}</p>
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

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat keuangan</p>
            <h2>Transaksi aktif</h2>
          </div>
        </div>
        <div className="paymentRows">
          {sales.length === 0 ? <div className="emptyState">Belum ada transaksi aktif.</div> : sales.slice(0, limit).map((sale) => (
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
        {sales.length > 0 ? (
          <div className="spListFoot">
            <span>Menampilkan {Math.min(limit, sales.length)} dari {sales.length} transaksi terbaru di periode ini.</span>
            {sales.length > limit ? <Link className="secondaryButton" href={moreHref()}>Tampilkan {Math.min(FINANCE_STEP, sales.length - limit)} lagi</Link> : null}
          </div>
        ) : null}
      </section>
    </section>
  );
}
