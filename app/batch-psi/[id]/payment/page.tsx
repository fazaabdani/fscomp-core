import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getBatchPaymentSummary } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { PrintPaymentButton } from "./PrintPaymentButton";

export default async function BatchPaymentPage({ params }: { params: { id: string } }) {
  requireRole(["admin"]);
  const summary = await getBatchPaymentSummary(params.id);
  if (!summary) notFound();

  return (
    <section className="pageStack paymentPage">
      <div className="printHidden">
        <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch PSI</Link>
      </div>

      <div className="paymentHeader">
        <div>
          <p className="eyebrow">Rekap pembayaran supplier</p>
          <h1>{summary.nomorBatch}</h1>
          <p>{summary.supplier} / Masuk {summary.tanggalMasuk} / Tempo {summary.tanggalTempo}</p>
        </div>
        <PrintPaymentButton />
      </div>

      <section className="paymentSummary">
        <div>
          <span>Total modal batch</span>
          <strong>{formatRupiah(summary.totalModal)}</strong>
        </div>
        <div>
          <span>Modal unit normal</span>
          <strong>{formatRupiah(summary.totalNormal)}</strong>
        </div>
        <div>
          <span>Modal unit problem</span>
          <strong>{formatRupiah(summary.totalProblem)}</strong>
        </div>
        <div className="netTransfer">
          <span>Perlu ditransfer</span>
          <strong>{formatRupiah(summary.netTransfer)}</strong>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Unit normal</p>
            <h2>Dibayarkan ke supplier</h2>
          </div>
        </div>
        <div className="paymentRows">
          {summary.normalUnits.map((unit) => (
            <div className="paymentRow" key={unit.id}>
              <span>Unit {unit.nomorUnit}</span>
              <strong>{unit.model}</strong>
              <b>{formatRupiah(unit.hargaModal)}</b>
            </div>
          ))}
          {summary.normalUnits.length === 0 ? <div className="emptyState">Belum ada unit normal.</div> : null}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Unit problem</p>
            <h2>Ditahan / dipotong dari pembayaran</h2>
          </div>
        </div>
        <div className="paymentRows">
          {summary.problemUnits.map((unit) => (
            <div className="paymentRow problemPaymentRow" key={unit.id}>
              <span>Unit {unit.nomorUnit}</span>
              <div>
                <strong>{unit.model}</strong>
                <small>Status: {unit.statusObservasi}</small>
                <small>Problem: {unit.problem}</small>
                <small>Catatan unit: {unit.catatan}</small>
              </div>
              <b>{formatRupiah(unit.hargaModal)}</b>
            </div>
          ))}
          {summary.problemUnits.length === 0 ? <div className="emptyState">Tidak ada unit problem.</div> : null}
        </div>
      </section>

      <section className="paymentNote">
        <strong>Catatan</strong>
        <p>Nominal transfer dihitung dari total modal unit normal. Modal unit problem ditahan/dipotong sampai ada keputusan retur, potongan, atau perbaikan.</p>
      </section>
    </section>
  );
}
