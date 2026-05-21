import { Banknote, Download, Receipt, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getFinancePageData } from "@/lib/db-data";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  requireRole(["admin"]);
  const { stats, sales } = await getFinancePageData();

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Keuangan</p>
          <h1>Laporan omzet, modal, dan profit kotor</h1>
          <p className="bodyText">Bagian ini hanya menghitung transaksi aktif. Transaksi batal tidak masuk omzet dan profit.</p>
        </div>
        <Link className="primaryButton" href="/api/finance/report"><Download size={17} /> Tarik Laporan CSV</Link>
      </div>

      <div className="statsGrid">
        <div className="metric metric-cyan"><Banknote size={20} /><span>Omzet</span><strong>{formatRupiah(stats.totalOmzet)}</strong></div>
        <div className="metric metric-blue"><Receipt size={20} /><span>Total modal</span><strong>{formatRupiah(stats.totalModal)}</strong></div>
        <div className="metric metric-green"><TrendingUp size={20} /><span>Profit kotor</span><strong>{formatRupiah(stats.totalProfit)}</strong></div>
        <div className="metric metric-blue"><Receipt size={20} /><span>Transaksi aktif</span><strong>{stats.totalTransaksi}</strong></div>
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
                <strong>Unit {sale.unitNomor} - {sale.model}</strong>
                <small>{sale.soldAt} / {sale.location} / {sale.paymentMethod} / {sale.itemCount} item</small>
              </div>
              <b>{formatRupiah(sale.soldPrice)}</b>
              <span>{formatRupiah(sale.costPrice)}</span>
              <span className={sale.grossProfit >= 0 ? "profitText" : "lossText"}>{formatRupiah(sale.grossProfit)}</span>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
