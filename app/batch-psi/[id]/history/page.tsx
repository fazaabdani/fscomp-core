import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBatchHistoryData } from "@/lib/db-data";

export const dynamic = "force-dynamic";

export default async function BatchHistoryPage({ params }: { params: { id: string } }) {
  const batch = await getBatchHistoryData(params.id);
  if (!batch) notFound();

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
          {batch.histories.length === 0 ? (
            <div className="emptyState">Belum ada QC harian untuk unit di batch ini.</div>
          ) : batch.histories.map((qc) => (
            <Link className="note linkNote" href={`/unit/${qc.unitId}`} key={qc.id}>
              <strong>Unit {qc.nomorUnit} - {qc.masihLolos}</strong>
              <small>{qc.model}</small>
              <p>{qc.kondisiHariIni}</p>
              <div className="miniMetrics">
                <span>SSD {qc.ssdHealth}%</span>
                <span>Battery {qc.batteryHealth}%</span>
                <span>{qc.windowsVersion}</span>
              </div>
              <small>{qc.tanggal} oleh {qc.checker}</small>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
