import { Calendar, Globe, Laptop2, MapPin, Phone } from "lucide-react";
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
  const noWarranty = sale.warrantySoftware === "Tidak ada" && sale.warrantyHardware === "Tidak ada";

  return (
    <article className="notaSheet">
      {sale.voidedAt ? <div className="notaVoidStamp">TRANSAKSI DIBATALKAN</div> : null}

      <div className="notaHeaderRow">
        <div className="notaBrandBlock">
          <img className="notaLogo" src="/branding/fs-comp-logo.webp" alt={sale.store.name} />
          <h2 className="notaBrandName">{sale.store.name}</h2>
          <p className="notaBrandSlogan">Solusi teknologi, untuk <em>masa depan</em></p>
        </div>

        <div className="notaContactBlock">
          <div className="notaContactLine"><Laptop2 size={15} /><span><strong>{sale.store.tagline}</strong><br />{sale.store.branch}</span></div>
          <div className="notaContactLine"><MapPin size={15} /><span>{sale.store.address}</span></div>
          <div className="notaContactLine"><Phone size={15} /><span>WA: {sale.store.phone}</span></div>
          <div className="notaContactLine"><Globe size={15} /><span>fscomp.id</span></div>
        </div>

        <div className="notaInvoiceBlock">
          <Eyebrow>NOTA PENJUALAN</Eyebrow>
          <h1 className="notaInvoiceNumber">{sale.invoiceNumber}</h1>
          <div className="notaInvoiceMeta"><Calendar size={14} /><span>{sale.soldAtDisplay}</span></div>
          <div className="notaInvoiceMeta"><MapPin size={14} /><span>{sale.location}</span></div>
        </div>

        <div className="notaQrBlock"><QRCodeSVG value={publicReceiptUrl} size={76} /></div>
      </div>

      <div className="notaDivider" aria-hidden="true" />

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
          {noWarranty ? (
            <strong>Tanpa garansi tambahan</strong>
          ) : (
            <>
              <strong>Software {sale.warrantySoftware}</strong>
              <small>Hardware {sale.warrantyHardware}</small>
            </>
          )}
        </div>
      </div>

      <div className="notaUnitBanner">
        <span className="notaUnitIcon"><Laptop2 size={18} /></span>
        {sale.unit ? (
          <div>
            <strong>Unit {sale.unit.nomorUnit} &middot; {sale.unit.model}</strong>
            <span>{sale.unit.processor} / RAM {sale.unit.ram} / {sale.unit.ssd}</span>
          </div>
        ) : (
          <div>
            <strong>Transaksi non-laptop</strong>
            <span>Tidak tertaut ke unit laptop</span>
          </div>
        )}
      </div>

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
          {noWarranty ? (
            <p>Barang/jasa ini dijual tanpa garansi tambahan dari FS Comp. Data pribadi pembeli disarankan dicadangkan mandiri.</p>
          ) : (
            <p>
              Garansi software {sale.warrantySoftware} dan hardware {sale.warrantyHardware} berlaku sesuai hasil QC
              dan pemakaian normal. Data pribadi pembeli disarankan dicadangkan mandiri.
            </p>
          )}
          {hasNotes ? <p className="notaExtraNote">Catatan: {sale.notes}</p> : null}
        </div>
        <div className="notaTotalBox">
          <span>TOTAL PEMBAYARAN</span>
          <strong>{formatRupiah(sale.subtotal)}</strong>
          <em>{sale.remainingPayment > 0 ? `Sisa ${formatRupiah(sale.remainingPayment)}` : "Lunas"}</em>
        </div>
      </div>

      <div className="notaBankRow">
        <p className="notaBankRowLabel">Rekening transaksi FS Comp</p>
        <div className="notaBankList">
          <span><strong>BCA</strong> 251-029-8724</span>
          <span><strong>MANDIRI</strong> 139-00-1590821-7</span>
          <span><strong>BRI</strong> 0325-01-017004538</span>
          <span><strong>DANA / OVO / GOPAY</strong> 0816692428</span>
          <span className="notaBankOwner">a.n. Faza Abdani Auni Robbi</span>
        </div>
      </div>

      <div className="notaBottomRow">
        <p className="notaThanks">Terima kasih atas kepercayaan Anda.</p>
        <div className="notaSignRow">
          <div className="notaSignBlock"><span>Pembeli</span></div>
          <div className="notaSignBlock"><span>Admin FS Comp</span></div>
        </div>
      </div>
    </article>
  );
}
