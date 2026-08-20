import { Gift, MapPin, Receipt, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getSalesPageData } from "@/lib/sales-page-data";
import { requireRole } from "@/lib/session";
import { SubmitButton } from "../SubmitButton";
import { createSaleAction, restoreSaleAction, voidSaleAction } from "./actions";
import { RestoreSaleButton } from "./RestoreSaleButton";
import { VoidSaleButton } from "./VoidSaleButton";
import { SaleUnitFields } from "./SaleUnitFields";
import { FlashNotice } from "../FlashNotice";

export const dynamic = "force-dynamic";

function includesText(value: unknown, q: string) {
  return String(value ?? "").toLowerCase().includes(q);
}

function salesHref(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const text = query.toString();
  return text ? `/sales?${text}` : "/sales";
}

export default async function SalesPage({ searchParams }: { searchParams?: { saved?: string; error?: string; voided?: string; restored?: string; sort?: string; q?: string; lokasi?: string; status?: string } }) {
  const currentUser = await requireRole(["admin", "teknisi", "sales"]);
  const { readyUnits, sales, stats, salesReady, blockedByDailyQc } = await getSalesPageData();
  const sort = searchParams?.sort ?? "terbaru";
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const lokasi = searchParams?.lokasi ?? "semua";
  const status = searchParams?.status ?? "semua";
  const filteredSales = sales.filter((sale) => {
    if (lokasi !== "semua" && sale.location.toLowerCase() !== lokasi) return false;
    if (status === "aktif" && sale.voidedAt) return false;
    if (status === "batal" && !sale.voidedAt) return false;
    if (!q) return true;
    return [
      sale.invoiceNumber,
      sale.nomorUnit,
      sale.model,
      sale.location,
      sale.paymentMethod,
      sale.buyerName,
      sale.notes,
      sale.voidReason,
      sale.soldAt
    ].some((value) => includesText(value, q));
  });
  const filteredReadyUnits = readyUnits.filter((unit) => {
    if (lokasi !== "semua" && unit.stockLocation.toLowerCase() !== lokasi) return false;
    if (!q) return true;
    return [unit.nomorUnit, unit.model, unit.processor, unit.ram, unit.ssd, unit.stockLocation].some((value) => includesText(value, q));
  });
  const sortedSales = [...filteredSales].sort((a, b) => {
    if (sort === "lama") return a.soldAt.localeCompare(b.soldAt);
    if (sort === "terbesar") return b.soldPrice - a.soldPrice;
    if (sort === "batal") return Number(Boolean(b.voidedAt)) - Number(Boolean(a.voidedAt));
    return b.soldAt.localeCompare(a.soldAt);
  });
  const flashMessage = searchParams?.saved
    ? "Transaksi berhasil disimpan."
    : searchParams?.voided
      ? "Transaksi dibatalkan. Unit kembali ke stok siap jual."
      : searchParams?.restored
        ? "Transaksi aktif kembali dan unit ditandai terjual."
        : searchParams?.error
          ? `Transaksi gagal: ${searchParams.error}`
          : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Penjualan dan Kasir</p>
          <h1>Kasir unit siap jual dan cetak nota</h1>
          <p className="bodyText">Unit yang muncul di kasir hanya unit siap jual, belum terjual, dan QC harian tidak gagal hardware.</p>
        </div>
        <ShoppingCart size={34} />
      </div>

      <div className="statsGrid salesStatsGrid">
        <div className="metric metric-blue"><Receipt size={21} /><span>Unit siap jual</span><strong>{stats.readyCount}</strong></div>
        <div className="metric metric-green"><ShoppingCart size={21} /><span>Transaksi</span><strong>{stats.soldCount}</strong></div>
        {currentUser.role === "admin" ? <Link className="metric metric-cyan" href="/finance"><Receipt size={21} /><span>Rekap</span><strong>Admin</strong></Link> : null}
      </div>

      {!salesReady ? (
        <div className="infoBox dangerInfo">
          Tabel penjualan belum aktif di database. Jalankan <strong>npm run db:migrate</strong> di terminal app Coolify, lalu restart/redeploy.
        </div>
      ) : null}

      {blockedByDailyQc > 0 ? (
        <div className="infoBox">
          {blockedByDailyQc} unit tidak dimunculkan di stok siap jual karena QC harian terakhir tidak lolos hardware.
        </div>
      ) : null}

      <form className="panel formGrid" action="/sales">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Filter sales</p>
            <h2>Cari transaksi dan stok siap jual</h2>
          </div>
          <Search size={22} />
        </div>
        <input type="hidden" name="sort" value={sort} />
        <div className="numberGrid">
          <label>Cari
            <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Invoice, unit, model, pembeli, metode bayar" />
          </label>
          <label>Lokasi
            <select name="lokasi" defaultValue={lokasi}>
              <option value="semua">Semua lokasi</option>
              <option value="wiradesa">Wiradesa</option>
              <option value="kajen">Kajen</option>
            </select>
          </label>
        </div>
        <label>Status transaksi
          <select name="status" defaultValue={status}>
            <option value="semua">Semua transaksi</option>
            <option value="aktif">Aktif saja</option>
            <option value="batal">Batal saja</option>
          </select>
        </label>
        <div className="buttonRow noMargin">
          <button className="secondaryButton" type="submit">Terapkan Filter</button>
          <Link className="secondaryButton" href="/sales">Reset</Link>
        </div>
      </form>

      <form className="panel formGrid cashierPanel" action={createSaleAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Kasir</p>
            <h2>Catat laptop terjual</h2>
          </div>
          <Link className="secondaryButton" href="/sales/non-laptop">Kasir Non-Laptop</Link>
        </div>
        <FlashNotice message={flashMessage} tone={searchParams?.error ? "error" : "success"} queryKeys={["saved", "voided", "restored", "error"]} />

        <div className="cashierMainGrid">
          <SaleUnitFields units={readyUnits} />
          <label>
            Metode bayar
            <select name="paymentMethod" defaultValue="Cash">
              <option>Cash</option>
              <option>Transfer</option>
              <option>DP</option>
            </select>
          </label>
          <label>
            DP / uang masuk
            <input name="dpAmount" type="number" inputMode="numeric" min="0" step="1000" placeholder="Isi kalau DP" />
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
              <span>Data lisensi otomatis masuk menu Lisensi kalau item tambahan berisi Office, Windows, software, atau kategori LISENSI/SOFTWARE.</span>
            </div>
            <div className="numberGrid">
              <label>
                Tipe lisensi
                <select name="licenseType" defaultValue="AUTO">
                  <option value="AUTO">Otomatis dari item</option>
                  <option value="OFFICE">Office</option>
                  <option value="WINDOWS">Windows</option>
                  <option value="ANTIVIRUS">Antivirus</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </label>
              <label>
                Versi lisensi
                <input name="licenseVersion" placeholder="Office 2021 / Windows 11 Pro" defaultValue="2021" />
              </label>
            </div>
            <div className="numberGrid">
              <label>
                Durasi lisensi
                <select name="licenseDurationType" defaultValue="LIFETIME">
                  <option value="LIFETIME">Lifetime</option>
                  <option value="YEARLY">Tahunan</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </label>
              <label>
                Berlaku sampai
                <input name="licenseValidUntil" type="date" />
              </label>
            </div>
            <label>
              Product key / kode lisensi
              <input name="licenseProductKey" placeholder="Opsional, bisa diisi nanti di menu Lisensi" />
            </label>
            <div className="receiptWarranty">
              <Gift size={18} />
              <span>Garansi nota diisi manual. Pilih minggu atau bulan sesuai transaksi.</span>
            </div>
            <div className="numberGrid">
              <label>
                Garansi software
                <input name="warrantySoftwareAmount" type="number" min="1" defaultValue={3} />
              </label>
              <label>
                Periode software
                <select name="warrantySoftwareUnit" defaultValue="bulan">
                  <option value="minggu">Minggu</option>
                  <option value="bulan">Bulan</option>
                </select>
              </label>
            </div>
            <div className="numberGrid">
              <label>
                Garansi hardware
                <input name="warrantyHardwareAmount" type="number" min="1" defaultValue={3} />
              </label>
              <label>
                Periode hardware
                <select name="warrantyHardwareUnit" defaultValue="minggu">
                  <option value="minggu">Minggu</option>
                  <option value="bulan">Bulan</option>
                </select>
              </label>
            </div>
            <label>
              Catatan
              <textarea name="notes" placeholder="Contoh: DP, transfer BCA, garansi, aksesoris tambahan." />
            </label>
            <SubmitButton pendingLabel="Menyimpan transaksi...">Simpan Penjualan</SubmitButton>
            {readyUnits.length === 0 ? <div className="emptyState">Belum ada unit siap jual. Transaksi lisensi/software tanpa laptop tetap dapat dicatat.</div> : null}
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
        <div className="salesControlBar">
          <div>
            <strong>{filteredSales.length}</strong>
            <span>dari {sales.length} transaksi</span>
          </div>
          <Link className={`sortPill ${sort === "terbaru" ? "active" : ""}`} href={salesHref({ sort: "terbaru", q: searchParams?.q ?? "", lokasi, status })}>Terbaru</Link>
          <Link className={`sortPill ${sort === "lama" ? "active" : ""}`} href={salesHref({ sort: "lama", q: searchParams?.q ?? "", lokasi, status })}>Terlama</Link>
          <Link className={`sortPill ${sort === "terbesar" ? "active" : ""}`} href={salesHref({ sort: "terbesar", q: searchParams?.q ?? "", lokasi, status })}>Nominal besar</Link>
          <Link className={`sortPill ${sort === "batal" ? "active" : ""}`} href={salesHref({ sort: "batal", q: searchParams?.q ?? "", lokasi, status })}>Batal</Link>
        </div>
        <div className="paymentRows transactionScroll">
          {sortedSales.length === 0 ? <div className="emptyState">Belum ada transaksi.</div> : sortedSales.map((sale) => (
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
                <span className="statusPill green">Aktif</span>
              )}
              <Link className="secondaryButton compactButton" href={`/sales/${sale.id}/receipt`}>Nota / Cetak ulang</Link>
              {currentUser.role === "admin" && !sale.voidedAt ? (
                <form action={voidSaleAction.bind(null, sale.id)} className="voidSaleForm">
                  <input type="hidden" name="voidReason" value="Transaksi batal dari kasir" />
                  <VoidSaleButton saleLabel={`${sale.invoiceNumber} / Unit ${sale.nomorUnit} - ${sale.model}`} compact />
                </form>
              ) : null}
              {currentUser.role === "admin" && sale.voidedAt ? (
                <form action={restoreSaleAction.bind(null, sale.id)} className="voidSaleForm">
                  <RestoreSaleButton saleLabel={`${sale.invoiceNumber} / Unit ${sale.nomorUnit} - ${sale.model}`} compact />
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
          {filteredReadyUnits.length === 0 ? <div className="emptyState">Belum ada stok siap jual yang cocok.</div> : filteredReadyUnits.slice(0, 14).map((unit) => (
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
