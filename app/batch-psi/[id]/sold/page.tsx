import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Receipt } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getBatchSoldUnits } from "@/lib/batch-sold-data";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BatchSoldUnitsPage({ params }: { params: { id: string } }) {
  await requireRole(["admin"]);
  const summary = await getBatchSoldUnits(params.id);
  if (!summary) notFound();

  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>

      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Unit terjual dari batch</p>
          <h1>{summary.nomorBatch}</h1>
          <p>{summary.supplier}</p>
        </div>
      </div>

      <section className="paymentSummary">
        <div>
          <span>Unit terjual</span>
          <strong>{summary.totalTerjual}{summary.totalUnitMasuk ? ` / ${summary.totalUnitMasuk}` : ""}</strong>
        </div>
        <div className="netTransfer">
          <span>Total omzet</span>
          <strong>{formatRupiah(summary.totalOmzet)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Daftar unit</p>
            <h2>{summary.units.length} unit terjual</h2>
          </div>
        </div>
        <div className="paymentRows">
          {summary.units.map((unit) => (
            <div className="paymentRow" key={unit.id}>
              <span>Unit {unit.nomorUnit}{unit.voided ? " (dibatalkan)" : ""}</span>
              <div>
                <strong>{unit.model}</strong>
                <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                <small>Pembeli: {unit.buyerName} ({unit.buyerPhone}) / Lokasi: {unit.location}</small>
                <small>Terjual: {unit.soldAt}</small>
              </div>
              <div className="listStack">
                <b>{formatRupiah(unit.soldPrice)}</b>
                {unit.saleId ? (
                  <Link className="secondaryButton" href={`/nota/${unit.saleId}`}><Receipt size={15} /> Lihat Nota</Link>
                ) : null}
              </div>
            </div>
          ))}
          {summary.units.length === 0 ? <div className="emptyState">Belum ada unit terjual dari batch ini.</div> : null}
        </div>
      </section>
    </section>
  );
}
