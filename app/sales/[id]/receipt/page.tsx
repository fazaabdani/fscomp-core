import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, MessageCircle, Receipt } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatRupiah } from "@/lib/api";
import { getSaleReceipt } from "@/lib/sale-receipt-data";
import { requireRole } from "@/lib/session";
import { restoreSaleAction, voidSaleAction } from "../../actions";
import { RestoreSaleButton } from "../../RestoreSaleButton";
import { VoidSaleButton } from "../../VoidSaleButton";
import { PrintReceiptButton } from "./PrintReceiptButton";

export const dynamic = "force-dynamic";

export default async function SaleReceiptPage({ params }: { params: { id: string } }) {
  const currentUser = requireRole(["admin", "teknisi", "sales"]);
  const sale = await getSaleReceipt(params.id);
  if (!sale) notFound();

  const buyerWa = sale.buyerPhone.replace(/\D/g, "").replace(/^0/, "62");
  const publicReceiptUrl = `${process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id"}/nota/${sale.id}`;
  const waText = [
    "Assalamu'alaikum kak.",
    "",
    "Terima kasih sudah membeli laptop di FS Comp.",
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
    "Terima kasih sudah percaya belanja di FS Comp."
  ].join("\n");
  const waHref = buyerWa.length >= 10
    ? `https://wa.me/${buyerWa}?text=${encodeURIComponent(waText)}`
    : `https://wa.me/?text=${encodeURIComponent(waText)}`;

  return (
    <section className="pageStack receiptPage">
      <div className="sectionTitle printHidden">
        <div>
          <Link className="backLink" href="/sales"><ArrowLeft size={16} /> Kembali ke kasir</Link>
          <p className="eyebrow">Nota Penjualan</p>
          <h1>{sale.invoiceNumber}</h1>
        </div>
        <div className="buttonCluster">
          <a className="secondaryButton" href={waHref} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Share WA</a>
          <PrintReceiptButton />
        </div>
        {currentUser.role === "admin" && !sale.voidedAt ? (
          <form action={voidSaleAction.bind(null, sale.id)} className="printHidden">
            <input type="hidden" name="voidReason" value="Transaksi batal dari nota" />
            <VoidSaleButton saleLabel={`${sale.invoiceNumber} / Unit ${sale.unit.nomorUnit} - ${sale.unit.model}`} />
          </form>
        ) : null}
        {currentUser.role === "admin" && sale.voidedAt ? (
          <form action={restoreSaleAction.bind(null, sale.id)} className="printHidden">
            <RestoreSaleButton saleLabel={`${sale.invoiceNumber} / Unit ${sale.unit.nomorUnit} - ${sale.unit.model}`} />
          </form>
        ) : null}
      </div>

      <article className="receiptPaper">
        {sale.voidedAt ? <div className="receiptVoidStamp">TRANSAKSI DIBATALKAN</div> : null}
        <header className="receiptTop">
          <div>
            <span className="receiptLogo">FS</span>
            <h2>{sale.store.name}</h2>
            <p>{sale.store.tagline}</p>
            <small>{sale.store.branch}</small>
            <small>{sale.store.address}</small>
            <small>HP/WA toko: {sale.store.phone}</small>
          </div>
          <div className="receiptMeta">
            <div className="receiptMetaText">
              <strong>{sale.invoiceNumber}</strong>
              <span>{sale.soldAt}</span>
              <span><MapPin size={14} /> {sale.location}</span>
            </div>
            <QRCodeSVG value={publicReceiptUrl} size={42} />
          </div>
        </header>

        <div className="receiptInfoGrid">
          <div>
            <span>Pembeli</span>
            <strong>{sale.buyerName}</strong>
            <small>{sale.buyerPhone}</small>
            <small>{sale.buyerAddress}</small>
          </div>
          <div>
            <span>Pembayaran</span>
            <strong>{sale.paymentMethod}</strong>
            {sale.dpAmount > 0 ? <small>DP masuk {formatRupiah(sale.dpAmount)}</small> : null}
            {sale.remainingPayment > 0 ? <small>Sisa {formatRupiah(sale.remainingPayment)}</small> : <small>Lunas</small>}
            <small>{sale.notes}</small>
          </div>
          <div>
            <span>Garansi</span>
            <strong>Software {sale.warrantySoftware}</strong>
            <small>Hardware {sale.warrantyHardware}</small>
          </div>
        </div>

        <section className="receiptUnit">
          <Receipt size={20} />
          <div>
            <strong>Unit {sale.unit.nomorUnit} - {sale.unit.model}</strong>
            <span>{sale.unit.processor} / {sale.unit.ram} / {sale.unit.ssd}</span>
          </div>
        </section>

        <div className="receiptTable">
          <div className="receiptTableHead">
            <span>Item</span>
            <span>Qty</span>
            <span>Harga</span>
            <span>Total</span>
          </div>
          {sale.items.map((item) => (
            <div className="receiptLine" key={item.id}>
              <span>
                <strong>{item.name}</strong>
                <small>{item.category}</small>
              </span>
              <span>{item.qty}</span>
              <span>{formatRupiah(item.unitPrice)}</span>
              <span>{formatRupiah(item.lineTotal)}</span>
            </div>
          ))}
        </div>

        <footer className="receiptFooter">
          <div className="receiptTerms">
            <strong>Ketentuan garansi</strong>
            <p>Garansi software {sale.warrantySoftware} dan hardware {sale.warrantyHardware} berlaku sesuai hasil QC dan pemakaian normal. Data pribadi pembeli disarankan dibackup mandiri.</p>
          </div>
          <div className="receiptTotals">
            <span>Total</span>
            <strong>{formatRupiah(sale.subtotal)}</strong>
            {sale.dpAmount > 0 ? <small>DP {formatRupiah(sale.dpAmount)}</small> : null}
            {sale.remainingPayment > 0 ? <small>Sisa {formatRupiah(sale.remainingPayment)}</small> : <small>Lunas</small>}
          </div>
        </footer>

        <div className="receiptBankNote">
          <strong>Rekening Transaksi FS Comp</strong>
          <span>BCA 251-029-8724 / Mandiri 139-00-1590821-7 / BRI 0325-01-017004-53-8 a.n. Faza Abdani Auni Robbi</span>
          <span>Dana / OVO / GoPay: 0816692428</span>
        </div>
      </article>
    </section>
  );
}
