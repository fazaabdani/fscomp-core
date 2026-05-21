import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Receipt } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getSaleReceipt } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { PrintReceiptButton } from "./PrintReceiptButton";

export const dynamic = "force-dynamic";

export default async function SaleReceiptPage({ params }: { params: { id: string } }) {
  requireRole(["admin"]);
  const sale = await getSaleReceipt(params.id);
  if (!sale) notFound();

  return (
    <section className="pageStack receiptPage">
      <div className="sectionTitle printHidden">
        <div>
          <Link className="backLink" href="/sales"><ArrowLeft size={16} /> Kembali ke kasir</Link>
          <p className="eyebrow">Nota Penjualan</p>
          <h1>{sale.invoiceNumber}</h1>
        </div>
        <PrintReceiptButton />
      </div>

      <article className="receiptPaper">
        <header className="receiptTop">
          <div>
            <span className="receiptLogo">FS</span>
            <h2>FS Comp</h2>
            <p>Laptop second berkualitas, QC jelas, garansi tertulis.</p>
          </div>
          <div className="receiptMeta">
            <strong>{sale.invoiceNumber}</strong>
            <span>{sale.soldAt}</span>
            <span><MapPin size={14} /> {sale.location}</span>
          </div>
        </header>

        <div className="receiptInfoGrid">
          <div>
            <span>Pembeli</span>
            <strong>{sale.buyerName}</strong>
            <small>{sale.buyerPhone}</small>
          </div>
          <div>
            <span>Pembayaran</span>
            <strong>{sale.paymentMethod}</strong>
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
            <p>Garansi software 3 bulan dan hardware 3 minggu berlaku sesuai hasil QC dan pemakaian normal. Data pribadi pembeli disarankan dibackup mandiri.</p>
          </div>
          <div className="receiptTotals">
            <span>Total</span>
            <strong>{formatRupiah(sale.subtotal)}</strong>
          </div>
        </footer>
      </article>
    </section>
  );
}
