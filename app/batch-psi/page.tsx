import { CalendarDays, FileClock, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { batches, formatRupiah, getUnitsByBatch } from "@/lib/api";
import { statusTone } from "@/lib/constants";

export default function BatchPsiPage() {
  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Batch PSI</p>
          <h1>Management batch masuk dan tempo pembayaran</h1>
        </div>
        <Link className="primaryButton" href="/batch-psi/new"><Plus size={17} /> Tambah Batch</Link>
      </div>

      <div className="batchManagement">
        {batches.map((batch) => {
          const batchUnits = getUnitsByBatch(batch.id);
          const totalModal = batchUnits.reduce((sum, unit) => sum + unit.hargaModal, 0);
          return (
            <article className="panel" key={batch.id}>
              <div className="panelHeader">
                <div>
                  <p className="eyebrow">{batch.nomorBatch}</p>
                  <h2>{batch.supplier}</h2>
                </div>
                <span className="statusPill yellow">{batch.statusPembayaran}</span>
              </div>

              <div className="batchMeta">
                <span><CalendarDays size={16} /> Masuk {batch.tanggalMasuk}</span>
                <span><FileClock size={16} /> Tempo {batch.tanggalTempo}</span>
                <span><ReceiptText size={16} /> Modal {formatRupiah(totalModal)}</span>
              </div>
              <p className="bodyText">{batch.catatan}</p>

              <div className="tableLike compact">
                {batchUnits.map((unit) => (
                  <Link className="unitRow" href={`/unit/${unit.id}`} key={unit.id}>
                    <span className="unitNumber">{unit.nomorUnit}</span>
                    <span>
                      <strong>{unit.model}</strong>
                      <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                    </span>
                    <span className={`statusPill ${statusTone[unit.statusObservasi]}`}>{unit.statusObservasi}</span>
                  </Link>
                ))}
              </div>

              <div className="buttonRow">
                <Link className="secondaryButton" href={`/batch-psi/${batch.id}/edit`}>Edit Batch</Link>
                <Link className="secondaryButton" href={`/unit/new?batch=${batch.id}`}>Tambah Unit</Link>
                <Link className="secondaryButton" href={`/batch-psi/${batch.id}/history`}>Histori QC</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
