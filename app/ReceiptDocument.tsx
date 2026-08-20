import { MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatRupiah } from "@/lib/api";
import type { getSaleReceipt } from "@/lib/sale-receipt-data";

type SaleReceipt = NonNullable<Awaited<ReturnType<typeof getSaleReceipt>>>;

function Eyebrow({ children }: { children: string }) {
  return (
    <div className="notaEyebrow">
      <span>{children}</span>
      <i />
    </div>
  );
}

export function ReceiptDocument({ sale, publicReceiptUrl }: { sale: SaleReceipt; publicReceiptUrl: string }) {
  const hasNotes = Boolean(sale.notes) && sale.notes !== "-";

  return (
    <article className="notaSheet">
      {sale.voidedAt ? <div className="notaVoidStamp">TRANSAKSI DIBATALKAN</div> : null}

      <aside className="notaSidebar">
        <div>
          <img className="notaLogo" src="/branding/fs-comp-logo.webp" alt={sale.store.name} />
          <span className="notaGoldRule" />
          <p className="notaTagline">{sale.store.tagline}</p>

          <p className="notaBranch">{sale.store.branch}</p>
          <p className="notaAddress">{sale.store.address}</p>

          <div className="notaContactRow"><strong>WA</strong><span>{sale.store.phone}</span></div>
          <div className="notaContactRow"><strong>WEB</strong><span>fscomp.id</span></div>
        </div>

        <div className="notaBankBlock">
          <Eyebrow>REKENING TRANSAKSI</Eyebrow>
          <div className="notaBankRow"><strong>BCA</strong><span>251-029-8724</span></div>
          <div className="notaBankRow"><strong>MANDIRI</strong><span>139-00-1590821-7</span></div>
          <div className="notaBankRow"><strong>BRI</strong><span>0325-01-017004538</span></div>
          <div className="notaBankRow"><strong>E-WALLET</strong><span>0816692428</span></div>
          <p className="notaBankNote">DANA / OVO / GOPAY</p>
          <p className="notaBankNote">a.n. Faza Abdani Auni Robbi</p>
        </div>

        <p className="notaThanks">Terima kasih atas kepercayaan Anda.</p>
      </aside>

      <div className="notaDivider" aria-hidden="true" />

      <div className="notaMain">
        <div className="notaMainHeader">
          <Eyebrow>NOTA PENJUALAN</Eyebrow>
          <h1 className="notaInvoiceNumber">{sale.invoiceNumber}</h1>
        </div>
        <div className="notaQr"><QRCodeSVG value={publicReceiptUrl} size={72} /></div>

        <div className="notaMetaRow">
          <span>{sale.soldAt}</span>
          <em />
          <span><MapPin size={14} /> {sale.location}</span>
        </div>

        <div className="notaInfoGrid">
          <div>
            <Eyebrow>PEMBELI</Eyebrow>
            <strong>{sale.buyerName}</strong>
            <small>{[sale.buyerPhone, sale.buyerAddress].filter(Boolean).join("  |  ")}</small>
          </div>
          <div>
            <Eyebrow>PEMBAYARAN</Eyebrow>
            <strong>{sale.paymentMethod}</strong>
            {sale.dpAmount > 0 ? <small>DP masuk {formatRupiah(sale.dpAmount)}</small> : null}
            <small>{sale.remainingPayment > 0 ? `Sisa ${formatRupiah(sale.remainingPayment)}` : "Lunas"}</small>
          </div>
          <div>
            <Eyebrow>GARANSI</Eyebrow>
            <strong>Software {sale.warrantySoftware}</strong>
            <small>Hardware {sale.warrantyHardware}</small>
          </div>
        </div>

        {sale.unit ? (
          <div className="notaUnitBanner">
            <strong>Unit {sale.unit.nomorUnit}  /  {sale.unit.model}</strong>
            <span>{sale.unit.processor}  |  RAM {sale.unit.ram}  |  {sale.unit.ssd}</span>
          </div>
        ) : (
          <div className="notaUnitBanner">
            <strong>Transaksi lisensi / software</strong>
            <span>Tidak tertaut ke unit laptop</span>
          </div>
        )}

        <div className="notaTable">
          <div className="notaTableHead">
            <span>Item</span>
            <span>Qty</span>
            <span>Harga</span>
            <span>Total</span>
          </div>
          {sale.items.map((item) => (
            <div className="notaTableRow" key={item.id}>
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

        <div className="notaFooterRow">
          <div className="notaTermsBlock">
            <Eyebrow>KETENTUAN GARANSI</Eyebrow>
            <p>
              Garansi software {sale.warrantySoftware} dan hardware {sale.warrantyHardware} berlaku sesuai hasil QC
              dan pemakaian normal. Data pribadi pembeli disarankan dicadangkan mandiri.
            </p>
            {hasNotes ? <p className="notaExtraNote">Catatan: {sale.notes}</p> : null}
          </div>
          <div className="notaTotalBox">
            <span>TOTAL PEMBAYARAN</span>
            <strong>{formatRupiah(sale.subtotal)}</strong>
            <em>{sale.remainingPayment > 0 ? `Sisa ${formatRupiah(sale.remainingPayment)}` : "Lunas"}</em>
          </div>
        </div>

        <div className="notaSignRow">
          <div className="notaSignBlock"><span>Pembeli</span></div>
          <div className="notaSignBlock"><span>Admin FS Comp</span></div>
        </div>
      </div>
    </article>
  );
}
