import { Gift, MapPin, Receipt, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getSalesPageData } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { createSaleAction, voidSaleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SalesPage({ searchParams }: { searchParams?: { saved?: string; error?: string; voided?: string } }) {
  requireRole(["admin"]);
  const { readyUnits, sales, stats, salesReady, blockedByDailyQc } = await getSalesPageData();
  const firstUnit = readyUnits[0];

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Penjualan dan Kasir</p>
          <h1>Kasir unit siap jual dan cetak nota</h1>
          <p className="bodyText">Unit yang muncul di kasir hanya unit siap jual, belum terjual, QC harian lolos, dan Gen 8 ke atas sudah tercatat Windows 11.</p>
        </div>
        <ShoppingCart size={34} />
      </div>

      <div className="statsGrid salesStatsGrid">
        <div className="metric metric-blue"><Receipt size={21} /><span>Unit siap jual</span><strong>{stats.readyCount}</strong></div>
        <div className="metric metric-green"><ShoppingCart size={21} /><span>Transaksi</span><strong>{stats.soldCount}</strong></div>
        <Link className="metric metric-cyan" href="/finance"><Receipt size={21} /><span>Laporan</span><strong>Keuangan</strong></Link>
      </div>

      {!salesReady ? (
        <div className="infoBox dangerInfo">
          Tabel penjualan belum aktif di database. Jalankan <strong>npm run db:migrate</strong> di terminal app Coolify, lalu restart/redeploy.
        </div>
      ) : null}

      {blockedByDailyQc > 0 ? (
        <div className="infoBox">
          {blockedByDailyQc} unit tidak dimunculkan di stok siap jual karena QC harian terakhir masih ada catatan/problem atau unit Gen 8 ke atas belum tercatat memakai Windows 11.
        </div>
      ) : null}

      <form className="panel formGrid cashierPanel" action={createSaleAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Kasir</p>
            <h2>Catat laptop terjual</h2>
          </div>
        </div>
        {searchParams?.saved ? <div className="successBox">Transaksi berhasil disimpan.</div> : null}
        {searchParams?.voided ? <div className="successBox">Transaksi dibatalkan. Unit sudah kembali ke stok siap jual.</div> : null}
        {searchParams?.error ? <div className="infoBox dangerInfo">Transaksi gagal: {searchParams.error}</div> : null}

        <div className="cashierMainGrid">
          <label>
            Unit
            <select name="unitId" defaultValue={firstUnit?.id} required>
              {readyUnits.map((unit) => (
                <option value={unit.id} key={unit.id}>
                  Unit {unit.nomorUnit} - {unit.model} - {formatRupiah(unit.hargaJualRekomendasi)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Harga jual final
            <input name="soldPrice" type="number" inputMode="numeric" min="0" step="1000" defaultValue={firstUnit?.hargaJualRekomendasi ?? 0} required />
          </label>
          <label>
            Lokasi penjualan
            <select name="location" defaultValue="WIRADESA">
              <option value="WIRADESA">Wiradesa utama</option>
              <option value="KAJEN">Kajen secondary</option>
            </select>
          </label>
          <label>
            Metode bayar
            <select name="paymentMethod" defaultValue="Cash">
              <option>Cash</option>
              <option>Transfer</option>
            </select>
          </label>
          <label>
            Nama pembeli
            <input name="buyerName" placeholder="Nama pembeli" />
          </label>
          <label>
            No. WhatsApp pembeli
            <input name="buyerPhone" placeholder="08xxxxxxxxxx" />
          </label>
          <label className="wideField">
            Alamat pembeli
            <input name="buyerAddress" placeholder="Alamat pembeli untuk nota" />
          </label>
        </div>

        <div className="cashierBottomGrid">
          <div className="panelSubsection cashierItems">
            <div>
              <p className="eyebrow">Item tambahan</p>
              <h3>Bonus, software, dan aksesoris</h3>
            </div>
            <div className="cashierItemHeader">
              <span>Item</span>
              <span>Kategori</span>
              <span>Qty</span>
              <span>Jual/pcs</span>
              <span>Modal/pcs</span>
            </div>
            {[
              { name: "Tas laptop", category: "BONUS", qty: 1, price: 0, cost: 0 },
              { name: "Mouse wireless", category: "BONUS", qty: 1, price: 0, cost: 0 },
              { name: "Microsoft Office", category: "SOFTWARE", qty: 1, price: 0, cost: 0 },
              { name: "", category: "LAINNYA", qty: 0, price: 0, cost: 0 }
            ].map((item) => (
              <div className="cashierItemRow" key={item.name || "custom-item"}>
                <input name="itemName" defaultValue={item.name} placeholder="Item tambahan" />
                <input name="itemCategory" defaultValue={item.category} />
                <input aria-label={`${item.name} qty`} name="itemQty" type="number" min="0" defaultValue={item.qty} />
                <input aria-label={`${item.name} harga jual`} name="itemPrice" type="number" inputMode="numeric" min="0" step="1000" defaultValue={item.price} />
                <input aria-label={`${item.name} modal`} name="itemCost" type="number" inputMode="numeric" min="0" step="1000" defaultValue={item.cost} />
              </div>
            ))}
            <small className="formHint">Qty 0 = item tidak ikut. Nominal ditulis angka rupiah tanpa titik, contoh 4100000.</small>
          </div>
          <div className="cashierSide">
            <div className="receiptWarranty">
              <Gift size={18} />
              <span>Garansi otomatis di nota: software 3 bulan, hardware 3 minggu.</span>
            </div>
            <label>
              Catatan
              <textarea name="notes" placeholder="Contoh: DP, transfer BCA, garansi, aksesoris tambahan." />
            </label>
            <button className="primaryButton" type="submit" disabled={readyUnits.length === 0}>Simpan Penjualan</button>
            {readyUnits.length === 0 ? <div className="emptyState">Belum ada unit siap jual. Pastikan QC harian terakhir sudah lolos.</div> : null}
          </div>
        </div>
      </form>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat transaksi</p>
            <h2>Penjualan terbaru</h2>
          </div>
        </div>
        <div className="paymentRows">
          {sales.length === 0 ? <div className="emptyState">Belum ada transaksi.</div> : sales.map((sale) => (
            <div className={`paymentRow saleRow ${sale.voidedAt ? "voidedSaleRow" : ""}`} key={sale.id}>
              <span>{sale.invoiceNumber}</span>
              <div>
                <Link href={`/sales/${sale.id}/receipt`}><strong>Unit {sale.nomorUnit} - {sale.model}</strong></Link>
                <small>{sale.soldAt} / {sale.location} / {sale.paymentMethod} / {sale.buyerName} / {sale.itemCount} item {sale.voidedAt ? `/ BATAL: ${sale.voidReason}` : ""}</small>
              </div>
              <b>{formatRupiah(sale.soldPrice)}</b>
              {sale.voidedAt ? (
                <span className="statusPill red">Batal</span>
              ) : (
                <span className={sale.grossProfit >= 0 ? "profitText" : "lossText"}>{formatRupiah(sale.grossProfit)}</span>
              )}
              <Link className="secondaryButton compactButton" href={`/sales/${sale.id}/receipt`}>Nota / Cetak ulang</Link>
              {!sale.voidedAt ? (
                <form action={voidSaleAction.bind(null, sale.id)} className="voidSaleForm">
                  <input type="hidden" name="voidReason" value="Transaksi batal dari kasir" />
                  <button className="secondaryButton compactButton" type="submit">Batalkan</button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Stok siap jual</p>
            <h2>Belum terjual</h2>
          </div>
          <MapPin size={22} />
        </div>
        <div className="tableLike compact stockGrid">
          {readyUnits.length === 0 ? <div className="emptyState">Belum ada stok siap jual.</div> : readyUnits.slice(0, 14).map((unit) => (
            <Link className="unitRow salesUnitRow" href={`/unit/${unit.id}`} key={unit.id}>
              <span className="unitNumber">{unit.nomorUnit}</span>
              <span>
                <strong>{unit.model}</strong>
                <small>{unit.processor} / {unit.ram} / {unit.ssd} / {unit.stockLocation}</small>
              </span>
              <b>{formatRupiah(unit.hargaJualRekomendasi)}</b>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
