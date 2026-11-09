import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { storeByLocation } from "@/lib/sale-receipt-data";
import { displayUnitNumber } from "@/lib/unit-number";
import { findSupplierByName } from "@/lib/supplier-data";
import { PrintReturButton } from "./PrintReturButton";

type Search = { supplier?: string; from?: string; note?: string; unit?: string | string[] };

export default async function ReturResiPage({ searchParams }: { searchParams?: Search }) {
  await requireRole(["admin", "teknisi"]);

  const supplierName = (searchParams?.supplier ?? "").trim();
  const unitIds = (Array.isArray(searchParams?.unit) ? searchParams?.unit : searchParams?.unit ? [searchParams.unit] : [])
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);
  const store = storeByLocation[searchParams?.from === "KAJEN" ? "KAJEN" : "WIRADESA"];
  const note = (searchParams?.note ?? "").trim().slice(0, 300);

  const supplier = supplierName ? await findSupplierByName(supplierName) : null;
  const units = unitIds.length
    ? await prisma.unit.findMany({
        where: { id: { in: unitIds }, soldAt: null },
        include: { batch: { select: { nomorBatch: true } } },
        orderBy: [{ batchId: "asc" }, { nomorUnit: "asc" }]
      })
    : [];

  if (!supplier || units.length === 0) {
    return (
      <section className="pageStack narrowPage">
        <Link className="backLink" href="/retur"><ArrowLeft size={16} /> Kembali ke Retur</Link>
        <div className="infoBox dangerInfo">
          {!supplier ? "Supplier belum punya alamat retur atau tidak ditemukan." : "Tidak ada unit yang dipilih."}
        </div>
      </section>
    );
  }

  const today = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date());
  const cityLine = [supplier.city, supplier.postalCode].filter(Boolean).join(" ");

  return (
    <section className="pageStack returLabelPage">
      <div className="printHidden buttonRow noMargin">
        <Link className="backLink" href={`/retur?supplier=${encodeURIComponent(supplier.name)}`}><ArrowLeft size={16} /> Kembali ke Retur</Link>
        <PrintReturButton />
      </div>

      <article className="returLabel">
        <header className="returLabelHead">
          <strong>RETUR BARANG</strong>
          <span>{today}</span>
        </header>

        <section className="returLabelTo">
          <small>KEPADA</small>
          <strong className="returLabelName">{supplier.recipientName || supplier.name}</strong>
          {supplier.recipientName ? <span className="returLabelCompany">{supplier.name}</span> : null}
          <p>{supplier.address}</p>
          {cityLine ? <p>{cityLine}</p> : null}
          {supplier.phone ? <p>Telp: <strong>{supplier.phone}</strong></p> : null}
        </section>

        <section className="returLabelFrom">
          <small>PENGIRIM</small>
          <strong>{store.branch}</strong>
          <p>{store.address}</p>
          <p>Telp: {store.phone}</p>
        </section>

        <section className="returLabelItems">
          <small>ISI PAKET ({units.length} unit laptop)</small>
          <ol>
            {units.map((unit) => (
              <li key={unit.id}>
                <strong>{displayUnitNumber(unit.nomorUnit)}</strong> {unit.model}
                <span>{unit.processor} / {unit.ram} / {unit.ssd} - {unit.batch.nomorBatch}</span>
              </li>
            ))}
          </ol>
          {note ? <p className="returLabelNote"><strong>Catatan:</strong> {note}</p> : null}
        </section>

        <footer className="returLabelFoot">ELEKTRONIK - JANGAN DIBANTING / JANGAN DITUMPUK</footer>
      </article>
    </section>
  );
}
