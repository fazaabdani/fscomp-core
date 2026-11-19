import { AlertTriangle, Boxes, Receipt, TrendingUp } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getOwnerSummary } from "@/lib/owner-dashboard";
import { requireRole } from "@/lib/session";
import { SyncOwnerDashboardButton } from "./SyncOwnerDashboardButton";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  await requireRole(["admin"]);
  const summary = await getOwnerSummary();

  return (
    <section className="pageStack">
      <div className="heroPanel">
        <div>
          <p className="eyebrow">Owner Command Center</p>
          <h1>Ringkasan FS Comp untuk own.fscomp.id</h1>
          <p>Data ini yang ditarik lewat <code>/api/integrations/owner-dashboard/summary</code> dan didorong ke own.fscomp.id lewat tombol sync di bawah.</p>
        </div>
        <div className="heroActions">
          <SyncOwnerDashboardButton />
        </div>
      </div>

      <div className="statsGrid">
        <article className="statCard"><TrendingUp size={19} /><span>Omzet hari ini</span><strong>{formatRupiah(summary.sales.today.omzet)}</strong></article>
        <article className="statCard"><TrendingUp size={19} /><span>Omzet minggu ini</span><strong>{formatRupiah(summary.sales.thisWeek.omzet)}</strong></article>
        <article className="statCard"><TrendingUp size={19} /><span>Omzet bulan ini</span><strong>{formatRupiah(summary.sales.thisMonth.omzet)}</strong></article>
        <article className="statCard"><TrendingUp size={19} /><span>Profit bulan ini</span><strong>{formatRupiah(summary.sales.thisMonth.profit)}</strong></article>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Penjualan per lokasi (bulan ini)</p>
            <h2>{summary.sales.thisMonth.count} transaksi</h2>
          </div>
        </div>
        <div className="listStack">
          {summary.sales.byLocation.length === 0 ? (
            <div className="emptyState">Belum ada penjualan bulan ini.</div>
          ) : (
            summary.sales.byLocation.map((location) => (
              <div className="unitListItem" key={location.location}>
                <div>
                  <strong>{location.location}</strong>
                  <small>{location.count} transaksi / Profit {formatRupiah(location.profit)}</small>
                </div>
                <span className="statusPill">{formatRupiah(location.omzet)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow"><Boxes size={15} /> Stok tersedia</p>
            <h2>{summary.stock.totalAvailable} unit belum terjual</h2>
          </div>
        </div>
        <div className="listStack">
          {summary.stock.byModel.length === 0 ? (
            <div className="emptyState">Tidak ada unit tersedia.</div>
          ) : (
            summary.stock.byModel.map((line) => (
              <div className="unitListItem" key={line.model}>
                <div><strong>{line.model}</strong></div>
                <span className="statusPill">{line.quantity} unit</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel dangerPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow"><Receipt size={15} /> Estimasi piutang pelanggan</p>
            <h2>{summary.receivables.count} transaksi DP belum lunas</h2>
          </div>
        </div>
        <div className="infoBox">
          Dihitung dari selisih <strong>dpAmount</strong> dan harga jual pada penjualan bulan ini — estimasi, bukan status lunas resmi.
        </div>
        <div className="listStack">
          {summary.receivables.items.length === 0 ? (
            <div className="emptyState">Tidak ada estimasi piutang bulan ini.</div>
          ) : (
            summary.receivables.items.map((item) => (
              <div className="unitListItem" key={item.saleId}>
                <div>
                  <strong>{item.invoiceNumber} - {item.buyerName ?? "Tanpa nama"}</strong>
                  <small>{item.buyerPhone ?? "-"}</small>
                </div>
                <span className="statusPill yellow">{formatRupiah(item.estimatedOutstanding)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel dangerPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow"><AlertTriangle size={15} /> Follow-up pembayaran batch</p>
            <h2>{summary.supplierFollowUp.count} batch perlu ditindaklanjuti</h2>
          </div>
        </div>
        <div className="listStack">
          {summary.supplierFollowUp.items.length === 0 ? (
            <div className="emptyState">Tidak ada batch yang butuh follow up.</div>
          ) : (
            summary.supplierFollowUp.items.map((batch) => (
              <div className="unitListItem" key={batch.batchId}>
                <div>
                  <strong>{batch.nomorBatch} - {batch.supplier}</strong>
                  <small>Tempo: {new Date(batch.tanggalTempo).toLocaleDateString("id-ID")}</small>
                </div>
                <span className="statusPill red">{batch.statusPembayaran.replaceAll("_", " ")}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
