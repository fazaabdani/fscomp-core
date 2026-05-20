import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { dailyQcs, getBatch, getUnitsByBatch } from "@/lib/api";

export default function BatchHistoryPage({ params }: { params: { id: string } }) {
  const batch = getBatch(params.id);
  if (!batch) notFound();

  const batchUnits = getUnitsByBatch(batch.id);
  const unitIds = new Set(batchUnits.map((unit) => unit.id));
  const histories = dailyQcs.filter((qc) => unitIds.has(qc.unitId));

  return (
    <section className="pageStack">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Histori QC</p>
          <h1>{batch.nomorBatch}</h1>
        </div>
      </div>

      <section className="panel">
        <div className="noteList">
          {histories.map((qc) => {
            const unit = batchUnits.find((item) => item.id === qc.unitId);
            return (
              <Link className="note linkNote" href={`/unit/${qc.unitId}`} key={qc.id}>
                <strong>Unit {unit?.nomorUnit} - {qc.masihLolos}</strong>
                <p>{qc.kondisiHariIni}</p>
                <div className="miniMetrics">
                  <span>SSD {qc.ssdHealth}%</span>
                  <span>Battery {qc.batteryHealth}%</span>
                </div>
                <small>{qc.tanggal} oleh {qc.checker}</small>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
