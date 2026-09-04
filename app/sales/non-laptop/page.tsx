import Link from "next/link";
import { ArrowLeft, Boxes, Receipt, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { formatRupiah } from "@/lib/api";
import { jakartaDateKey } from "@/lib/inventory";
import { SubmitButton } from "../../SubmitButton";
import { createSaleAction } from "../actions";
import { FlashNotice } from "../../FlashNotice";

const itemRows = [
  { name: "Microsoft Office", category: "LISENSI" },
  { name: "Windows", category: "LISENSI" },
  { name: "", category: "AKSESORI" },
  { name: "", category: "SPAREPART" },
  { name: "", category: "JASA" },
  { name: "", category: "LAINNYA" }
];

const SOLD_ITEMS_LIMIT = 150;

export default async function NonLaptopCashierPage({ searchParams }: { searchParams?: { error?: string } }) {
  await requireRole(["admin", "teknisi", "sales"]);
  const [stockItems, soldItems, soldItemsTotalCount] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { status: "STOCK" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, category: true, serialNumber: true, costPrice: true }
    }),
    prisma.saleItem.findMany({
      where: { sale: { unitId: null, voidedAt: null } },
      include: { sale: { select: { id: true, invoiceNumber: true, soldAt: true, buyerName: true, buyerPhone: true, location: true } } },
      orderBy: { createdAt: "desc" },
      take: SOLD_ITEMS_LIMIT
    }),
    prisma.saleItem.count({ where: { sale: { unitId: null, voidedAt: null } } })
  ]);
  const soldItemsTruncated = soldItemsTotalCount > soldItems.length;
  const message = searchParams?.error === "item-wajib"
    ? "Isi minimal satu item dengan qty dan harga jual lebih dari nol."
    : searchParams?.error === "inventaris-sudah-terjual"
      ? "Salah satu barang inventaris yang dipilih ternyata sudah terjual duluan. Periksa ulang pilihan barang."
      : searchParams?.error
        ? `Transaksi gagal: ${searchParams.error}`
        : "";

  return <section className="pageStack">
    <div className="sectionTitle">
      <div>
        <Link className="backLink" href="/sales"><ArrowLeft size={16} /> Kembali ke kasir laptop</Link>
        <p className="eyebrow">Kasir Non-Laptop</p>
        <h1>Lisensi, barang, sparepart, dan jasa</h1>
        <p className="bodyText">Semua transaksi tetap masuk ke nota, finance, dan arsip penjualan Core tanpa mengubah stok laptop.</p>
      </div>
      <Boxes size={34} />
    </div>

    <FlashNotice message={message} tone="error" queryKeys={["error"]} />

    <form className="panel formGrid cashierPanel" action={createSaleAction}>
      <input type="hidden" name="saleMode" value="STANDALONE" />
      <input type="hidden" name="soldPrice" value="0" />
      <div className="panelHeader">
        <div><p className="eyebrow">Transaksi Baru</p><h2>Catat penjualan non-laptop</h2></div>
        <Receipt size={22} />
      </div>

      <div className="cashierMainGrid">
        <label>Lokasi transaksi
          <select name="location" defaultValue="WIRADESA">
            <option value="WIRADESA">Wiradesa / FS Comp</option>
            <option value="KAJEN">Kajen / FS.ID</option>
          </select>
        </label>
        <label>Metode bayar
          <select name="paymentMethod" defaultValue="Cash"><option>Cash</option><option>Transfer</option><option>DP</option></select>
        </label>
        <label>DP / uang masuk<input name="dpAmount" type="number" inputMode="numeric" min="0" step="1000" placeholder="Isi kalau DP" /></label>
        <label>Nama pembeli<input name="buyerName" placeholder="Nama pembeli" /></label>
        <label>No. WhatsApp pembeli<input name="buyerPhone" placeholder="08xxxxxxxxxx" /></label>
        <label>Alamat pembeli<input name="buyerAddress" placeholder="Alamat pembeli untuk nota" /></label>
      </div>

      <div className="panelSubsection cashierItems">
        <div><p className="eyebrow">Daftar Item</p><h3>Barang atau layanan yang dijual</h3></div>
        <div className="cashierItemHeader"><span>Item</span><span>Stok inventaris</span><span>Kategori</span><span>Qty</span><span>Jual/pcs</span><span>Modal/pcs</span></div>
        {itemRows.map((item, index) => <div className="cashierItemRow" key={`${item.category}-${index}`}>
          <input name="itemName" defaultValue={item.name} placeholder="Nama barang/layanan" data-item-name={index} />
          <select name="itemInventoryId" defaultValue="" aria-label={`Tautkan ke barang inventaris untuk item ${index + 1}`} data-item-inventory={index}>
            <option value="">Tidak terhubung inventaris</option>
            {stockItems.map((stockItem) => (
              <option value={stockItem.id} key={stockItem.id} data-name={stockItem.name} data-cost={stockItem.costPrice}>
                {stockItem.name}{stockItem.serialNumber ? ` (${stockItem.serialNumber})` : ""}
              </option>
            ))}
          </select>
          <select name="itemCategory" defaultValue={item.category} aria-label={`Kategori item ${index + 1}`}>
            <option value="LISENSI">Lisensi</option><option value="SOFTWARE">Software</option><option value="AKSESORI">Aksesori</option>
            <option value="SPAREPART">Sparepart</option><option value="JASA">Jasa</option><option value="LAINNYA">Lainnya</option>
          </select>
          <input name="itemQty" type="number" min="0" defaultValue={0} aria-label={`Qty item ${index + 1}`} />
          <input name="itemPrice" type="number" inputMode="numeric" min="0" step="1000" defaultValue={0} aria-label={`Harga jual item ${index + 1}`} />
          <input name="itemCost" type="number" inputMode="numeric" min="0" step="1000" defaultValue={0} aria-label={`Modal item ${index + 1}`} data-item-cost={index} />
        </div>)}
        <small className="formHint">Item dengan qty 0 tidak ikut nota. Kalau ditautkan ke barang inventaris, qty otomatis dianggap 1, nama dan modal terisi otomatis dari data inventaris, dan barang itu ditandai terjual. Untuk transaksi lisensi, isi jenis dan detail aktivasi di bagian bawah.</small>
      </div>

      <div className="cashierBottomGrid">
        <div className="panelSubsection formGrid">
          <div><p className="eyebrow">Detail Lisensi</p><h3>Diisi jika menjual lisensi/software</h3></div>
          <div className="numberGrid">
            <label>Tipe lisensi<select name="licenseType" defaultValue="AUTO"><option value="AUTO">Otomatis dari item</option><option value="OFFICE">Office</option><option value="WINDOWS">Windows</option><option value="ANTIVIRUS">Antivirus</option><option value="OTHER">Lainnya</option></select></label>
            <label>Versi lisensi<input name="licenseVersion" placeholder="Office 2021 / Windows 11 Pro" /></label>
          </div>
          <div className="numberGrid">
            <label>Durasi<select name="licenseDurationType" defaultValue="LIFETIME"><option value="LIFETIME">Lifetime</option><option value="YEARLY">Tahunan</option><option value="CUSTOM">Custom</option></select></label>
            <label>Berlaku sampai<input name="licenseValidUntil" type="date" /></label>
          </div>
          <label>Product key / kode lisensi<input name="licenseProductKey" placeholder="Opsional, bisa dilengkapi dari menu Lisensi" /></label>
        </div>
        <div className="panelSubsection formGrid">
          <div><p className="eyebrow">Nota</p><h3>Garansi dan catatan</h3></div>
          <div className="numberGrid">
            <label>Garansi hardware<input name="warrantyHardwareAmount" type="number" min="0" defaultValue={3} /></label>
            <label>Periode<select name="warrantyHardwareUnit" defaultValue="bulan"><option value="minggu">Minggu</option><option value="bulan">Bulan</option></select></label>
          </div>
          <small className="formHint">Kosongkan Garansi hardware kalau barang/jasa ini memang tidak ada garansi.</small>
          <label>Catatan<textarea name="notes" placeholder="Detail barang, layanan, garansi, atau informasi aktivasi." /></label>
          <SubmitButton icon={<Receipt size={16} />} pendingLabel="Menyimpan transaksi...">Simpan dan Buat Nota</SubmitButton>
        </div>
      </div>
    </form>

    <section className="panel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Rekap</p>
          <h2>Barang non-laptop terjual</h2>
        </div>
        <ShoppingBag size={22} />
      </div>

      {soldItemsTruncated ? (
        <div className="infoBox">
          Menampilkan {soldItems.length} dari {soldItemsTotalCount} item terbaru yang terjual.
        </div>
      ) : null}

      {soldItems.length === 0 ? (
        <div className="emptyState">Belum ada barang non-laptop yang terjual.</div>
      ) : (
        <div className="tableScroll">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Harga jual</th>
                <th>Inventaris</th>
                <th>Pembeli</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {soldItems.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong><br /><small>{item.category}</small></td>
                  <td>{item.qty}</td>
                  <td>{formatRupiah(item.lineTotal)}</td>
                  <td>{item.inventoryItemId ? <span className="statusPill green">Tertaut</span> : <span className="statusPill yellow">Manual</span>}</td>
                  <td><small>{item.sale.buyerName || "-"}</small><br /><small>{item.sale.buyerPhone || "-"}</small></td>
                  <td><Link className="secondaryButton compactButton" href={`/sales/${item.sale.id}/receipt`}>{item.sale.invoiceNumber}</Link><br /><small>{jakartaDateKey(item.sale.soldAt)}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>

    <script
      dangerouslySetInnerHTML={{
        __html: `
document.addEventListener("change", function (event) {
  var target = event.target;
  if (!target || target.getAttribute("data-item-inventory") === null) return;
  var row = target.closest(".cashierItemRow");
  if (!row) return;
  var nameInput = row.querySelector("[data-item-name]");
  var costInput = row.querySelector("[data-item-cost]");
  var option = target.options[target.selectedIndex];
  if (!target.value || !option) return;
  var name = option.getAttribute("data-name");
  var cost = option.getAttribute("data-cost");
  if (nameInput && name) nameInput.value = name;
  if (costInput && cost) costInput.value = cost;
});
`.trim()
      }}
    />
  </section>;
}
