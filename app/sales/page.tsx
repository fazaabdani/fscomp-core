import { Banknote, MapPin, Receipt, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getSalesPageData } from "@/lib/db-data";
import { requireRole } from "@/lib/session";
import { createSaleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SalesPage({ searchParams }: { searchParams?: { saved?: string; error?: string } }) {
  requireRole(["admin"]);
  const { readyUnits, sales, stats, salesReady, blockedByDailyQc } = await getSalesPageData();
  const firstUnit = readyUnits[0];

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Penjualan dan Kasir</p>
          <h1>Unit siap jual, lokasi toko, omzet, dan keuntungan</h1>
          <p className="bodyText">Unit yang muncul di kasir hanya unit VERIFIED atau VERIFIED WITH NOTES dan belum tercatat terjual.</p>
        </div>
        <ShoppingCart size={34} />
      </div>

      <div className="statsGrid">
        <div className="metric metric-blue"><Receipt size={21} /><span>Unit siap jual</span><strong>{stats.readyCount}</strong></div>
        <div className="metric metric-green"><ShoppingCart size={21} /><span>Transaksi</span><strong>{stats.soldCount}</strong></div>
        <div className="metric metric-cyan"><Banknote size={21} /><span>Omzet</span><strong>{formatRupiah(stats.totalOmzet)}</strong></div>
        <div className="metric metric-green"><Banknote size={21} /><span>Profit kotor</span><strong>{formatRupiah(stats.totalProfit)}</strong></div>
      </div>

      {!salesReady ? (
        <div className="infoBox dangerInfo">
          Tabel penjualan belum aktif di database. Jalankan <strong>npm run db:migrate</strong> di terminal app Coolify, lalu restart/redeploy.
        </div>
      ) : null}

      {blockedByDailyQc > 0 ? (
        <div className="infoBox">
          {blockedByDailyQc} unit tidak dimunculkan di stok siap jual karena QC harian terakhir masih ada catatan/problem. Kalau speaker, keyboard, SSD, WiFi, Bluetooth, booting, atau battery bermasalah, unit ditahan dulu.
        </div>
      ) : null}

      <div className="salesLayout">
        <form className="panel formGrid" action={createSaleAction}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Kasir</p>
              <h2>Catat laptop terjual</h2>
            </div>
          </div>
          {searchParams?.saved ? <div className="successBox">Transaksi berhasil disimpan.</div> : null}
          {searchParams?.error ? <div className="infoBox dangerInfo">Transaksi gagal: {searchParams.error}</div> : null}
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
          <div className="numberGrid">
            <label>
              Harga jual final
              <input name="soldPrice" type="number" min="0" defaultValue={firstUnit?.hargaJualRekomendasi ?? 0} required />
            </label>
            <label>
              Lokasi penjualan
              <select name="location" defaultValue="WIRADESA">
                <option value="WIRADESA">Wiradesa utama</option>
                <option value="KAJEN">Kajen secondary</option>
              </select>
            </label>
          </div>
          <div className="numberGrid">
            <label>
              Metode bayar
              <input name="paymentMethod" defaultValue="Cash" />
            </label>
            <label>
              Nama pembeli
              <input name="buyerName" placeholder="Opsional" />
            </label>
          </div>
          <label>
            Catatan
            <textarea name="notes" placeholder="Contoh: DP, transfer BCA, garansi, aksesoris tambahan." />
          </label>
          <button className="primaryButton" type="submit" disabled={readyUnits.length === 0}>Simpan Penjualan</button>
          {readyUnits.length === 0 ? <div className="emptyState">Belum ada unit siap jual. Pastikan QC awal sudah VERIFIED.</div> : null}
        </form>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Stok siap jual</p>
              <h2>Belum terjual</h2>
            </div>
            <MapPin size={22} />
          </div>
          <div className="tableLike compact">
            {readyUnits.length === 0 ? <div className="emptyState">Belum ada stok siap jual.</div> : readyUnits.slice(0, 14).map((unit) => (
              <Link className="unitRow salesUnitRow" href={`/unit/${unit.id}`} key={unit.id}>
                <span className="unitNumber">{unit.nomorUnit}</span>
                <span>
                  <strong>{unit.model}</strong>
                  <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                </span>
                <b>{formatRupiah(unit.hargaJualRekomendasi)}</b>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat transaksi</p>
            <h2>Penjualan terbaru</h2>
          </div>
        </div>
        <div className="paymentRows">
          {sales.length === 0 ? <div className="emptyState">Belum ada transaksi.</div> : sales.map((sale) => (
            <div className="paymentRow saleRow" key={sale.id}>
              <span>Unit {sale.nomorUnit}</span>
              <div>
                <strong>{sale.model}</strong>
                <small>{sale.soldAt} / {sale.location} / {sale.paymentMethod} / {sale.buyerName}</small>
              </div>
              <b>{formatRupiah(sale.soldPrice)}</b>
              <span className={sale.grossProfit >= 0 ? "profitText" : "lossText"}>{formatRupiah(sale.grossProfit)}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
