import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { displayUnitNumber } from "@/lib/unit-number";
import { findSupplierByName, normalizeSupplierName, supplierNameOptions } from "@/lib/supplier-data";
import { ReturUnitPicker } from "./ReturUnitPicker";

export default async function ReturPage({ searchParams }: { searchParams?: { supplier?: string; batch?: string } }) {
  await requireRole(["admin", "teknisi"]);

  let supplierName = (searchParams?.supplier ?? "").trim();
  const batchId = (searchParams?.batch ?? "").trim();
  let batchLabel = "";

  if (batchId) {
    const batch = await prisma.batchPSI.findUnique({ where: { id: batchId }, select: { supplier: true, nomorBatch: true } });
    if (batch) {
      supplierName = batch.supplier;
      batchLabel = batch.nomorBatch;
    }
  }

  const options = await supplierNameOptions();
  const master = supplierName ? await findSupplierByName(supplierName) : null;

  const units = supplierName
    ? (await prisma.unit.findMany({
        where: {
          statusObservasi: "RETUR_DISTRIBUTOR",
          soldAt: null,
          ...(batchId && batchLabel ? { batchId } : {})
        },
        include: { batch: { select: { supplier: true, nomorBatch: true } } },
        orderBy: [{ batchId: "asc" }, { nomorUnit: "asc" }]
      })).filter((unit) => normalizeSupplierName(unit.batch.supplier) === normalizeSupplierName(supplierName))
    : [];

  return (
    <section className="pageStack narrowPage">
      <Link className="backLink" href="/batch-psi"><ArrowLeft size={16} /> Kembali ke Batch</Link>
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Retur ke supplier</p>
          <h1>Cetak resi retur</h1>
        </div>
      </div>

      <form className="panel formGrid" action="/retur">
        <label>Supplier
          <select name="supplier" defaultValue={supplierName} required>
            <option value="" disabled>Pilih supplier</option>
            {options.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button className="secondaryButton" type="submit">Tampilkan unit retur</button>
      </form>

      {supplierName ? (
        <>
          {master ? (
            <div className="infoBox">
              <strong>Dikirim ke:</strong> {master.recipientName ? `${master.recipientName}, ` : ""}{master.name}<br />
              {master.address}{master.city || master.postalCode ? `, ${[master.city, master.postalCode].filter(Boolean).join(" ")}` : ""}
              {master.phone ? <><br />Telp {master.phone}</> : null}
              {" "}<Link href={`/supplier/${master.id}/edit`}>Ubah alamat</Link>
            </div>
          ) : (
            <div className="infoBox dangerInfo">
              Supplier &quot;{supplierName}&quot; belum punya alamat retur.{" "}
              <Link href={`/supplier/new?name=${encodeURIComponent(supplierName)}`}>Isi alamat dulu</Link> sebelum mencetak resi.
            </div>
          )}

          {master ? (
            units.length > 0 ? (
              <form className="panel formGrid" action="/retur/resi" method="get">
                <input type="hidden" name="supplier" value={master.name} />
                <div className="panelHeader">
                  <div>
                    <p className="eyebrow">{batchLabel ? `Batch ${batchLabel}` : "Semua batch supplier ini"}</p>
                    <h2>Pilih unit yang masuk paket</h2>
                  </div>
                </div>
                <label>Pengirim
                  <select name="from" defaultValue="WIRADESA">
                    <option value="WIRADESA">FS Comp Wiradesa</option>
                    <option value="KAJEN">FS.ID Kajen</option>
                  </select>
                </label>
                <label>Alasan / catatan untuk supplier (opsional)
                  <textarea name="note" maxLength={300} placeholder="Contoh: layar bergaris, SSD health di bawah standar" />
                </label>
                <ReturUnitPicker
                  preselectAll={Boolean(batchLabel)}
                  units={units.map((unit) => ({
                    id: unit.id,
                    nomorUnit: displayUnitNumber(unit.nomorUnit),
                    model: unit.model,
                    spec: `${unit.processor} / ${unit.ram} / ${unit.ssd}`,
                    nomorBatch: unit.batch.nomorBatch
                  }))}
                />
              </form>
            ) : (
              <div className="emptyState">
                Belum ada unit berstatus Retur Distributor untuk supplier ini. Tandai unitnya dulu lewat tombol Retur di halaman Batch.
              </div>
            )
          ) : null}
        </>
      ) : null}
    </section>
  );
}
