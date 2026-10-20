import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Pencil } from "lucide-react";
import { ReceiptDocument } from "@/app/ReceiptDocument";
import { getSaleReceipt } from "@/lib/sale-receipt-data";
import { requireRole } from "@/lib/session";
import { restoreSaleAction, voidSaleAction } from "../../actions";
import { RestoreSaleButton } from "../../RestoreSaleButton";
import { VoidSaleButton } from "../../VoidSaleButton";
import { PaymentPanel } from "./PaymentPanel";
import { PrintReceiptButton } from "./PrintReceiptButton";

export const dynamic = "force-dynamic";

export default async function SaleReceiptPage({ params, searchParams }: { params: { id: string }; searchParams?: { duplicate?: string; success?: string; error?: string } }) {
  const currentUser = await requireRole(["admin", "teknisi", "sales"]);
  const sale = await getSaleReceipt(params.id);
  if (!sale) notFound();

  const buyerWa = sale.buyerPhone.replace(/\D/g, "").replace(/^0/, "62");
  const publicReceiptUrl = `${process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id"}/nota/${sale.id}`;
  const storeShortName = sale.location === "Kajen" ? "FSID" : "FS Comp";
  const waText = [
    "Assalamu'alaikum kak.",
    "",
    `Terima kasih sudah membeli laptop di ${storeShortName}.`,
    "Semoga laptopnya bermanfaat, awet, dan bisa membantu kebutuhan kerja, sekolah, kuliah, usaha, maupun aktivitas sehari-hari.",
    "",
    `Nota digital: ${publicReceiptUrl}`,
    "",
    "Tips singkat perawatan laptop second:",
    "1. Wajib rutin dipakai / dinyalakan minimal 3 kali seminggu selama 15-30 menit.",
    "2. Simpan di tempat kering, hindari tempat lembap atau rawan terkena air.",
    "3. Gunakan charger yang sesuai.",
    "4. Jangan dipakai di atas kasur, lebih aman di meja atau alas keras.",
    "5. Jaga agar tidak overheat, beri jeda jika terasa panas.",
    "6. Matikan laptop dengan benar lewat shutdown Windows.",
    "7. Jangan biarkan baterai sering habis total, charger saat sekitar 20-30%.",
    "8. Jauhkan dari cairan seperti air, kopi, teh, dan hujan.",
    "9. Jangan install aplikasi sembarangan agar aman dari virus atau Windows error.",
    "10. Segera konsultasi kalau ada gejala aneh seperti panas, keyboard error, layar kedip, baterai boros, atau sering restart.",
    "",
    "Kalau ada kendala atau ingin konsultasi, silakan langsung hubungi kami nggih.",
    `Terima kasih sudah percaya belanja di ${storeShortName}.`
  ].join("\n");
  const paymentErrors: Record<string, string> = {
    "jumlah-pembayaran-tidak-valid": "Jumlah pembayaran harus lebih dari nol.",
    "melebihi-sisa": "Jumlah pembayaran melebihi sisa tagihan.",
    "sudah-lunas": "Transaksi ini sudah lunas.",
    "transaksi-dibatalkan": "Transaksi ini sudah dibatalkan.",
    "pembayaran-gagal-coba-lagi": "Pembayaran gagal disimpan. Muat ulang halaman (bisa jadi baru saja dicatat orang lain) lalu coba lagi."
  };
  const paymentError = searchParams?.error ? (paymentErrors[searchParams.error] ?? `Gagal: ${searchParams.error}`) : "";
  const outstanding = sale.remainingPayment;
  const waHref = buyerWa.length >= 10
    ? `https://wa.me/${buyerWa}?text=${encodeURIComponent(waText)}`
    : `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return (
    <section className="pageStack notaPageWrap">
      {searchParams?.duplicate ? (
        <div className="infoBox printHidden">Unit ini sudah tercatat terjual sebelumnya (nota di bawah) — submit yang barusan tidak dibuat sebagai transaksi baru, biar tidak tercatat dobel.</div>
      ) : null}
      {searchParams?.success === "updated" ? (
        <div className="infoBox printHidden">Nota berhasil diperbarui.</div>
      ) : null}
      {searchParams?.success === "payment-added" ? (
        <div className="infoBox printHidden">Pembayaran dicatat.</div>
      ) : null}
      {searchParams?.success === "payment-removed" ? (
        <div className="infoBox printHidden">Pembayaran dihapus dan total dibayar disesuaikan.</div>
      ) : null}
      {paymentError ? <div className="infoBox dangerInfo printHidden">{paymentError}</div> : null}
      {!sale.voidedAt && outstanding > 0 ? (
        <div className="infoBox printHidden">Belum lunas, sisa <strong>Rp {outstanding.toLocaleString("id-ID")}</strong>. Catat pelunasan di panel <a href="#pembayaran">Pembayaran</a> di bawah nota, jangan buat transaksi baru.</div>
      ) : null}
      {sale.lastEditedByName ? (
        <div className="infoBox printHidden">Terakhir diedit oleh <strong>{sale.lastEditedByName}</strong> pada {sale.lastEditedAt}.</div>
      ) : null}
      <div className="sectionTitle printHidden">
        <div>
          <Link className="backLink" href="/sales"><ArrowLeft size={16} /> Kembali ke kasir</Link>
          <p className="eyebrow">Nota Penjualan</p>
          <h1>{sale.invoiceNumber}</h1>
        </div>
        <div className="buttonCluster">
          <a className="secondaryButton" href={waHref} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Share WA</a>
          <PrintReceiptButton />
          {!sale.voidedAt ? <Link className="secondaryButton" href={`/sales/${sale.id}/edit`}><Pencil size={16} /> Edit Nota</Link> : null}
        </div>
        {currentUser.role === "admin" && !sale.voidedAt ? (
          <form action={voidSaleAction.bind(null, sale.id)} className="printHidden">
            <input type="hidden" name="voidReason" value="Transaksi batal dari nota" />
            <VoidSaleButton saleLabel={`${sale.invoiceNumber} / ${sale.unit ? `Unit ${sale.unit.nomorUnit} - ${sale.unit.model}` : "Lisensi / software"}`} />
          </form>
        ) : null}
        {currentUser.role === "admin" && sale.voidedAt ? (
          <form action={restoreSaleAction.bind(null, sale.id)} className="printHidden">
            <RestoreSaleButton saleLabel={`${sale.invoiceNumber} / ${sale.unit ? `Unit ${sale.unit.nomorUnit} - ${sale.unit.model}` : "Lisensi / software"}`} />
          </form>
        ) : null}
      </div>

      <ReceiptDocument sale={sale} publicReceiptUrl={publicReceiptUrl} />

      <PaymentPanel sale={sale} isAdmin={currentUser.role === "admin"} />
    </section>
  );
}
