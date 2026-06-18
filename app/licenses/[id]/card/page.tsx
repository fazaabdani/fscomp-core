import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { notFound } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { formatDateWib } from "@/lib/inventory";
import { licenseDurationLabel, licenseTypeLabel } from "@/lib/licenses";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { PrintLicenseCardButton } from "./PrintLicenseCardButton";

export const dynamic = "force-dynamic";

export default async function LicenseCardPage({ params }: { params: { id: string } }) {
  requireRole(["admin", "sales"]);
  const license = await prisma.licenseRecord.findUnique({
    where: { id: params.id },
    include: {
      unit: { select: { nomorUnit: true, model: true, processor: true, ram: true, ssd: true } },
      sale: { select: { invoiceNumber: true, soldAt: true } }
    }
  });

  if (!license) notFound();

  const publicUrl = process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id";
  const cardUrl = `${publicUrl}/licenses/${license.id}/card`;
  const unitText = license.unit
    ? `Unit ${license.unit.nomorUnit} - ${license.unit.model}`
    : license.laptopSeries || "Belum ditautkan unit";

  return (
    <section className="pageStack licenseCardPage">
      <div className="sectionTitle printHidden">
        <div>
          <Link className="backLink" href="/licenses"><ArrowLeft size={16} /> Kembali ke lisensi</Link>
          <p className="eyebrow">Kartu Lisensi</p>
          <h1>{license.name}</h1>
        </div>
        <PrintLicenseCardButton />
      </div>

      <article className="licenseCard">
        <div className="licenseCardTop">
          <div>
            <span className="licenseCardBrand">FS Comp Digital License</span>
            <h2>{license.name}</h2>
            <p>{licenseTypeLabel(license.licenseType)} / {license.version}</p>
          </div>
          <div className="licenseCardBadge">{license.durationType === "LIFETIME" ? "LIFETIME" : "ACTIVE"}</div>
        </div>

        <div className="licenseCardKeyBox">
          <span>Product Key</span>
          <strong>{license.productKey || "Belum diisi"}</strong>
        </div>

        <div className="licenseCardGrid">
          <div>
            <span>Pembeli</span>
            <strong>{license.buyerName || "-"}</strong>
            <small>{license.buyerPhone || "-"}</small>
          </div>
          <div>
            <span>Laptop</span>
            <strong>{unitText}</strong>
            {license.unit ? <small>{license.unit.processor} / {license.unit.ram} / {license.unit.ssd}</small> : <small>Seri manual</small>}
          </div>
          <div>
            <span>Tanggal pembelian</span>
            <strong>{formatDateWib(license.purchaseDate)}</strong>
            <small>{license.sale?.invoiceNumber ? `Nota ${license.sale.invoiceNumber}` : "Input manual"}</small>
          </div>
          <div>
            <span>Masa lisensi</span>
            <strong>{licenseDurationLabel(license.durationType, license.validUntil)}</strong>
            <small>Simpan kartu ini sebagai bukti lisensi.</small>
          </div>
        </div>

        <footer className="licenseCardFooter">
          <div>
            <strong>FS Comp</strong>
            <span>Laptop second berkualitas, QC jelas, garansi tertulis.</span>
          </div>
          <QRCodeSVG value={cardUrl} size={58} fgColor="#0f2f6b" />
        </footer>
      </article>
    </section>
  );
}
