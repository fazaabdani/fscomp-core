import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { maskProductKey } from "@/lib/licenses";
import { updateLicenseNotesAction } from "../../actions";

export default async function EditLicenseNotesPage({ params }: { params: { id: string } }) {
  requireRole(["admin", "sales"]);
  const license = await prisma.licenseRecord.findUnique({
    where: { id: params.id },
    include: { unit: { select: { nomorUnit: true, model: true } }, sale: { select: { invoiceNumber: true } } }
  });
  if (!license) notFound();

  return <section className="pageStack narrowPage">
    <div className="sectionTitle">
      <div>
        <Link className="backLink" href="/licenses"><ArrowLeft size={16} /> Kembali ke lisensi</Link>
        <p className="eyebrow">Edit catatan lisensi</p>
        <h1>{license.name}</h1>
        <p className="bodyText">Key {maskProductKey(license.productKey)} · {license.sale?.invoiceNumber ?? "Input manual"}</p>
      </div>
    </div>
    <form className="panel formGrid" action={updateLicenseNotesAction.bind(null, license.id)}>
      <div className="receiptWarranty">
        <span>{license.unit ? `Unit ${license.unit.nomorUnit} - ${license.unit.model}` : license.laptopSeries || "Tanpa laptop"}</span>
      </div>
      <label>Catatan
        <textarea name="notes" defaultValue={license.notes ?? ""} maxLength={2000} rows={8} placeholder="Catatan aktivasi, akun, kendala, atau informasi pelanggan." />
      </label>
      <div className="buttonRow noMargin">
        <button className="primaryButton" type="submit"><Save size={16} /> Simpan Catatan</button>
        <Link className="secondaryButton" href="/licenses">Batal</Link>
      </div>
    </form>
  </section>;
}
