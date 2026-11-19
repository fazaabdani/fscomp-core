import { Gift, MapPin, Receipt, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { getSalesPageData } from "@/lib/sales-page-data";
import { requireRole } from "@/lib/session";
import { MARKETPLACES, paymentStatus } from "@/lib/sale-payments";
import { SubmitButton } from "../SubmitButton";
import { createSaleAction, restoreSaleAction, voidSaleAction } from "./actions";
import { RestoreSaleButton } from "./RestoreSaleButton";
import { VoidSaleButton } from "./VoidSaleButton";
import { SaleUnitFields } from "./SaleUnitFields";
import { FlashNotice } from "../FlashNotice";
import "./kasir.css";

export const dynamic = "force-dynamic";

function includesText(value: unknown, q: string) {
  return String(value ?? "").toLowerCase().includes(q);
}

function salesHref(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  const text = query.toString();
  return text ? `/sales?${text}` : "/sales";
}

export default async function SalesPage({ searchParams }: { searchParams?: { saved?: string; error?: string; voided?: string; restored?: string; sort?: string; q?: string; lokasi?: string; status?: string; detail?: string } }) {
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
        : searchParams?.error === "modal-kosong"
          ? `Modal belum diisi untuk: ${searchParams.detail ?? "item berbayar"}. Isi kolom Modal/pcs, atau centang "Modal memang Rp 0" kalau barangnya gratis.`
          : searchParams?.error
            ? `Transaksi gagal: ${searchParams.error}`
            : "";

  const filterActive = Boolean(q || lokasi !== "semua" || status !== "semua");
  const isAdmin = currentUser.role === "admin";
  const defaultItems = [
    { name: "Tas laptop", category: "BONUS", qty: 1 },
    { name: "Mouse wireless", category: "BONUS", qty: 1 },
    { name: "Microsoft Office", category: "SOFTWARE", qty: 1 },
    { name: "", category: "LAINNYA", qty: 0 }
  ];

  return (
    <section className="pageStack kasirPage">
      <div className="kasirHead">
        <div>
          <p className="eyebrow">Penjualan dan Kasir</p>
          <h1>Kasir laptop</h1>
        </div>
        <div className="kasirHeadStats">
          <span className="kasirStat"><Receipt size={16} /> Siap jual <strong>{stats.readyCount}</strong></span>
          <span className="kasirStat"><ShoppingCart size={16} /> Transaksi <strong>{stats.soldCount}</strong></span>
        </div>
        <div className="kasirHeadLinks">
          <Link className="secondaryButton" href="/sales/non-laptop">Kasir Non-Laptop</Link>
          {isAdmin ? <Link className="secondaryButton" href="/sales/piutang">Piutang</Link> : null}
          {isAdmin ? <Link className="secondaryButton" href="/finance">Rekap keuangan</Link> : null}
        </div>
      </div>

      {!salesReady ? (
        <div className="infoBox dangerInfo">
          Tabel penjualan belum aktif di database. Jalankan <strong>npm run db:migrate</strong> di terminal app Coolify, lalu restart/redeploy.
        </div>
      ) : null}
      {blockedByDailyQc > 0 ? (
        <div className="infoBox">{blockedByDailyQc} unit tidak dimunculkan di stok siap jual karena QC harian terakhir tidak lolos hardware.</div>
      ) : null}
      <FlashNotice message={flashMessage} tone={searchParams?.error ? "error" : "success"} queryKeys={["saved", "voided", "restored", "error", "detail"]} />

      <div className="kasirLayout">
        <form className="kasirForm" action={createSaleAction}>
          <section className="kasirStep">
            <h2><span className="kasirNum">1</span> Laptop dan harga</h2>
            <div className="kasirFields kasirFields3">
              <SaleUnitFields units={readyUnits} />
            </div>
            {readyUnits.length === 0 ? <div className="emptyState">Belum ada unit siap jual. Transaksi lisensi/software tanpa laptop tetap dapat dicatat.</div> : null}
          </section>

          <section className="kasirStep">
            <h2><span className="kasirNum">2</span> Pembayaran</h2>
            <div className="kasirFields kasirFields4">
              <label>Metode bayar
                <select name="paymentMethod" defaultValue="Cash">
                  <option>Cash</option>
                  <option>Transfer</option>
                  <option>DP</option>
                </select>
              </label>
              <label>DP / uang masuk
                <input name="dpAmount" type="number" inputMode="numeric" min="0" step="1000" placeholder="Kosongkan bila lunas" />
              </label>
              <label>Channel penjualan
                <select name="marketplaceName" defaultValue="">
                  <option value="">Langsung (toko)</option>
                  {MARKETPLACES.map((marketplace) => <option key={marketplace}>{marketplace}</option>)}
                </select>
              </label>
              <label>Potongan admin marketplace (Rp)
                <input name="marketplaceFee" type="number" inputMode="numeric" min="0" step="1000" placeholder="Hanya bila lewat marketplace" />
              </label>
            </div>
            <small className="formHint">Pelunasan DP dicatat di nota nanti, bukan transaksi baru.</small>
          </section>

          <section className="kasirStep">
            <h2><span className="kasirNum">3</span> Pembeli</h2>
            <div className="kasirFields kasirFields3">
              <label>Nama pembeli<input name="buyerName" placeholder="Nama pembeli" /></label>
              <label>No. WhatsApp<input name="buyerPhone" placeholder="08xxxxxxxxxx" /></label>
              <label>Alamat (untuk nota)<input name="buyerAddress" placeholder="Alamat pembeli" /></label>
            </div>
          </section>

          <section className="kasirStep">
            <h2><span className="kasirNum">4</span> Bonus, software, dan aksesoris <small>opsional</small></h2>
            <div className="kasirItems">
              <div className="kasirItemRow kasirItemHead">
                <span>Item</span><span>Kategori</span><span>Qty</span><span>Jual/pcs</span><span>Modal/pcs</span>
              </div>
              {defaultItems.map((item) => (
                <div className="kasirItemRow" key={item.name || "custom-item"}>
                  <input name="itemName" defaultValue={item.name} placeholder="Item tambahan" aria-label="Nama item" />
                  <input name="itemCategory" defaultValue={item.category} aria-label="Kategori item" />
                  <input name="itemQty" type="number" min="0" defaultValue={item.qty} aria-label={`${item.name || "Item"} qty`} />
                  <input name="itemPrice" type="number" inputMode="numeric" min="0" step="1000" defaultValue={0} aria-label={`${item.name || "Item"} harga jual`} />
                  <input name="itemCost" type="number" inputMode="numeric" min="0" step="1000" defaultValue={0} aria-label={`${item.name || "Item"} modal`} />
                </div>
              ))}
            </div>
            <small className="formHint">Qty 0 = item tidak ikut. Ketik angka rupiah tanpa titik (contoh 4100000). Item yang dijual berharga wajib punya modal.</small>
            <label className="checkTile"><input type="checkbox" name="confirmZeroCost" /> Modal item tambahan memang Rp 0 (gratis)</label>
          </section>

          <section className="kasirStep">
            <h2><span className="kasirNum">5</span> Garansi nota</h2>
            <div className="kasirFields kasirFields4">
              <label>Garansi software<input name="warrantySoftwareAmount" type="number" min="1" defaultValue={3} /></label>
              <label>Periode
                <select name="warrantySoftwareUnit" defaultValue="bulan"><option value="minggu">Minggu</option><option value="bulan">Bulan</option></select>
              </label>
              <label>Garansi hardware<input name="warrantyHardwareAmount" type="number" min="1" defaultValue={3} /></label>
              <label>Periode
                <select name="warrantyHardwareUnit" defaultValue="minggu"><option value="minggu">Minggu</option><option value="bulan">Bulan</option></select>
              </label>
            </div>
            <details className="kasirMore">
              <summary><Gift size={15} /> Data lisensi (Office, Windows, antivirus) <small>opsional, bisa diisi nanti di menu Lisensi</small></summary>
              <div className="kasirFields kasirFields4">
                <label>Tipe lisensi
                  <select name="licenseType" defaultValue="AUTO">
                    <option value="AUTO">Otomatis dari item</option>
                    <option value="OFFICE">Office</option>
                    <option value="WINDOWS">Windows</option>
                    <option value="ANTIVIRUS">Antivirus</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </label>
                <label>Versi<input name="licenseVersion" placeholder="Office 2021 / Windows 11 Pro" defaultValue="2021" /></label>
                <label>Durasi
                  <select name="licenseDurationType" defaultValue="LIFETIME">
                    <option value="LIFETIME">Lifetime</option>
                    <option value="YEARLY">Tahunan</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </label>
                <label>Berlaku sampai<input name="licenseValidUntil" type="date" /></label>
              </div>
              <label>Product key / kode lisensi<input name="licenseProductKey" placeholder="Opsional" /></label>
              <small className="formHint">Lisensi otomatis masuk menu Lisensi bila item tambahan berisi Office, Windows, software, atau kategori LISENSI/SOFTWARE.</small>
            </details>
          </section>

          <div className="kasirSubmitBar">
            <label className="kasirNote">Catatan (opsional)
              <input name="notes" placeholder="Contoh: DP, transfer BCA, aksesoris tambahan" />
            </label>
            <SubmitButton pendingLabel="Menyimpan transaksi...">Simpan Penjualan</SubmitButton>
          </div>
        </form>

        <aside className="kasirAside">
          <div className="kasirAsideHead">
            <h2><MapPin size={17} /> Stok siap jual</h2>
            <span>{filteredReadyUnits.length} unit</span>
          </div>
          <div className="kasirStock">
            {filteredReadyUnits.length === 0 ? <div className="emptyState">Belum ada stok siap jual yang cocok.</div> : filteredReadyUnits.slice(0, 30).map((unit) => (
              <Link className="kasirStockRow" href={`/unit/${unit.id}`} key={unit.id}>
                <span className="unitNumber">{unit.nomorUnit}</span>
                <span>
                  <strong>{unit.model}</strong>
                  <small>{unit.processor} / {unit.ram} / {unit.ssd} / {unit.stockLocation}</small>
                </span>
                <b>{formatRupiah(unit.hargaJualRekomendasi)}</b>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <section className="panel kasirHistory">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat transaksi</p>
            <h2>Penjualan terbaru</h2>
          </div>
        </div>
        <form className="kasirFilter" action="/sales">
          <input type="hidden" name="sort" value={sort} />
          <input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Cari invoice, unit, model, pembeli..." aria-label="Cari transaksi" />
          <select name="lokasi" defaultValue={lokasi} aria-label="Lokasi">
            <option value="semua">Semua lokasi</option>
            <option value="wiradesa">Wiradesa</option>
            <option value="kajen">Kajen</option>
          </select>
          <select name="status" defaultValue={status} aria-label="Status transaksi">
            <option value="semua">Semua status</option>
            <option value="aktif">Aktif saja</option>
            <option value="batal">Batal saja</option>
          </select>
          <button className="primaryButton" type="submit">Cari</button>
          {filterActive ? <Link className="secondaryButton" href="/sales">Reset</Link> : null}
        </form>
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
                {!sale.voidedAt ? (
                  <small>
                    {paymentStatus(sale).settled ? "Lunas" : `Dibayar ${formatRupiah(sale.dpAmount)}, sisa ${formatRupiah(paymentStatus(sale).remaining)}`}
                    {currentUser.role === "admin" ? ` / Laba ${formatRupiah(sale.grossProfit)}` : ""}
                    {currentUser.role === "admin" && sale.marketplaceFee > 0 ? ` / Potongan ${sale.marketplaceName || "admin"} ${formatRupiah(sale.marketplaceFee)}` : ""}
                  </small>
                ) : null}
              </div>
              <b>{formatRupiah(sale.soldPrice)}</b>
              {sale.voidedAt ? (
                <span className="statusPill red">Batal</span>
              ) : paymentStatus(sale).settled ? (
                <span className="statusPill green">Lunas</span>
              ) : (
                <span className="statusPill yellow">Belum lunas</span>
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
    </section>
  );
}
