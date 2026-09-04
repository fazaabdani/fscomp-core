import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { updateSaleAction } from "../../actions";
import { FlashNotice } from "@/app/FlashNotice";

function parseWarranty(value: string, fallbackUnit: "minggu" | "bulan") {
  if (value === "Tidak ada") return { amount: null as number | null, unit: fallbackUnit };
  const match = value.match(/^(\d+)\s+(minggu|bulan)/i);
  if (!match) return { amount: 3, unit: fallbackUnit };
  return { amount: Number(match[1]), unit: match[2].toLowerCase() as "minggu" | "bulan" };
}

export default async function EditSalePage({ params, searchParams }: { params: { id: string }; searchParams?: { error?: string } }) {
  const currentUser = await requireRole(["admin", "teknisi", "sales"]);

  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      invoiceNumber: true,
      unitId: true,
      voidedAt: true,
      location: true,
      paymentMethod: true,
      buyerName: true,
      buyerPhone: true,
      buyerAddress: true,
      dpAmount: true,
      subtotal: true,
      warrantySoftware: true,
      warrantyHardware: true,
      notes: true,
      unit: { select: { nomorUnit: true, model: true } }
    }
  });
  if (!sale) notFound();
  if (sale.voidedAt) redirect(`/sales/${sale.id}/receipt`);

  const standalone = !sale.unitId;
  const softwareWarranty = parseWarranty(sale.warrantySoftware, "bulan");
  const hardwareWarranty = parseWarranty(sale.warrantyHardware, standalone ? "bulan" : "minggu");

  const message = searchParams?.error === "invalid-input"
    ? "Data belum valid. Periksa metode bayar dan isian lainnya."
    : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <Link className="backLink" href={`/sales/${sale.id}/receipt`}><ArrowLeft size={16} /> Kembali ke nota</Link>
          <p className="eyebrow">Edit Nota</p>
          <h1>{sale.invoiceNumber}</h1>
          <p className="bodyText">
            {sale.unit ? `Unit ${sale.unit.nomorUnit} - ${sale.unit.model}` : "Transaksi non-laptop"}. Item, qty, dan harga tidak bisa diubah di sini — kalau transaksinya salah total, batalkan dari nota lalu buat ulang.
          </p>
        </div>
      </div>

      <FlashNotice message={message} tone="error" queryKeys={["error"]} />

      <form className="panel formGrid" action={updateSaleAction.bind(null, sale.id)}>
        {currentUser.role === "admin" ? (
          <label>Lokasi transaksi / kop nota
            <select name="location" defaultValue={sale.location}>
              <option value="WIRADESA">Wiradesa / FS Comp</option>
              <option value="KAJEN">Kajen / FS.ID</option>
            </select>
            <small className="formHint">Cuma admin yang bisa koreksi ini. Ganti kop nota dan ikut mengubah perhitungan bagi hasil Wiradesa/Kajen di halaman Finance.</small>
          </label>
        ) : null}
        <div className="numberGrid">
          <label>Metode bayar
            <select name="paymentMethod" defaultValue={sale.paymentMethod}>
              <option>Cash</option><option>Transfer</option><option>DP</option>
            </select>
          </label>
          <label>DP / uang masuk<input name="dpAmount" type="number" inputMode="numeric" min="0" step="1000" defaultValue={sale.dpAmount} /></label>
        </div>

        <div className="numberGrid">
          <label>Nama pembeli<input name="buyerName" defaultValue={sale.buyerName ?? ""} /></label>
          <label>No. WhatsApp pembeli<input name="buyerPhone" defaultValue={sale.buyerPhone ?? ""} /></label>
        </div>

        <label>Alamat pembeli<input name="buyerAddress" defaultValue={sale.buyerAddress ?? ""} /></label>

        {standalone ? (
          <>
            <div className="numberGrid">
              <label>Garansi hardware<input name="warrantyHardwareAmount" type="number" min="0" defaultValue={hardwareWarranty.amount ?? ""} /></label>
              <label>Periode<select name="warrantyHardwareUnit" defaultValue={hardwareWarranty.unit}><option value="minggu">Minggu</option><option value="bulan">Bulan</option></select></label>
            </div>
            <small className="formHint">Kosongkan Garansi hardware kalau barang/jasa ini memang tidak ada garansi.</small>
          </>
        ) : (
          <>
            <div className="numberGrid">
              <label>Garansi software<input name="warrantySoftwareAmount" type="number" min="1" defaultValue={softwareWarranty.amount ?? 3} /></label>
              <label>Periode software<select name="warrantySoftwareUnit" defaultValue={softwareWarranty.unit}><option value="minggu">Minggu</option><option value="bulan">Bulan</option></select></label>
            </div>
            <div className="numberGrid">
              <label>Garansi hardware<input name="warrantyHardwareAmount" type="number" min="1" defaultValue={hardwareWarranty.amount ?? 3} /></label>
              <label>Periode hardware<select name="warrantyHardwareUnit" defaultValue={hardwareWarranty.unit}><option value="minggu">Minggu</option><option value="bulan">Bulan</option></select></label>
            </div>
          </>
        )}

        <label>Catatan<textarea name="notes" defaultValue={sale.notes ?? ""} /></label>

        <div className="buttonRow">
          <button className="primaryButton" type="submit"><Save size={16} /> Simpan Perubahan</button>
          <Link className="secondaryButton" href={`/sales/${sale.id}/receipt`}>Batal</Link>
        </div>
      </form>
    </section>
  );
}
