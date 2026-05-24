import { notFound } from "next/navigation";
import { MapPin, Receipt } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getSaleReceipt } from "@/lib/db-data";

export const dynamic = "force-dynamic";

export default async function PublicReceiptPage({ params }: { params: { id: string } }) {
  const sale = await getSaleReceipt(params.id);
  if (!sale || sale.voidedAt) notFound();

  return (
    <section className="pageStack receiptPage">
      <article className="receiptPaper">
        <header className="receiptTop">
          <div>
            <span className="receiptLogo">FS</span>
            <h2>FS Comp</h2>
            <p>Laptop second berkualitas, QC jelas, garansi tertulis.</p>
            <small>FS Comp / FS Media Comp Wiradesa</small>
            <small>Jl. Wiradesa No.1 RT 22 RW 05, Desa Wiradesa, Kecamatan Wiradesa, Kabupaten Pekalongan, Jawa Tengah 51152</small>
            <small>HP/WA toko: 0816660056</small>
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
            <small>{sale.buyerAddress}</small>
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
            <p>Garansi software 3 bulan dan hardware 3 minggu berlaku sesuai hasil QC dan pemakaian normal. Simpan nota digital ini sebagai bukti transaksi.</p>
          </div>
          <div className="receiptTotals">
            <span>Total</span>
            <strong>{formatRupiah(sale.subtotal)}</strong>
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
