import Link from "next/link";
import { Boxes, ClipboardList, Edit3, PackagePlus, ShieldCheck } from "lucide-react";
import type { InventoryItemStatus, WarrantyDurationUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateInput, formatDateWib, inventoryStatusLabel, inventoryStatusTone, warrantyInfo, warrantyUnitLabel } from "@/lib/inventory";
import { canViewPrice } from "@/lib/auth";
import { requireRole } from "@/lib/session";
import { formatRupiah } from "@/lib/api";
import { createInventoryItemAction } from "./actions";
import { FlashNotice } from "../FlashNotice";

const categories = ["SSD", "RAM", "CHARGER", "BATERAI", "LCD", "KEYBOARD", "AKSESORIS", "LAINNYA"];

const statuses: InventoryItemStatus[] = ["STOCK", "USED_IN_UNIT", "SOLD", "RETURNED", "DAMAGED", "LOST"];
const warrantyUnits: WarrantyDurationUnit[] = ["DAY", "WEEK", "MONTH", "YEAR"];

function categoryLabel(category: string) {
  if (category === "LAINNYA") return "Lainnya";
  return category;
}

export default async function InventoryPage({ searchParams }: { searchParams?: { error?: string; success?: string } }) {
  const currentUser = await requireRole(["admin", "teknisi", "sales"]);
  const canEditInventory = currentUser.role === "admin" || currentUser.role === "sales";
  const canSeePrice = canViewPrice(currentUser);

  const [items, units] = await Promise.all([
    prisma.inventoryItem.findMany({
      include: {
        unit: { select: { nomorUnit: true, model: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: [{ arrivedAt: "desc" }, { createdAt: "desc" }]
    }),
    prisma.unit.findMany({
      where: { soldAt: null },
      select: { id: true, nomorUnit: true, model: true },
      orderBy: [{ nomorUnit: "asc" }]
    })
  ]);

  const activeWarrantyCount = items.filter((item) => warrantyInfo(item).tone === "green").length;
  const expiringWarrantyCount = items.filter((item) => warrantyInfo(item).label === "Garansi mau habis").length;
  const stockCount = items.filter((item) => item.status === "STOCK").length;
  const problemCount = items.filter((item) => item.status === "DAMAGED" || item.status === "RETURNED").length;

  const message =
    searchParams?.error === "required"
      ? "Nama barang, supplier, dan tanggal beli wajib diisi."
      : searchParams?.error === "invalid-input"
        ? "Data inventaris belum valid. Periksa tanggal dan nilai angka."
      : searchParams?.success === "created"
        ? "Barang masuk berhasil direkap."
        : searchParams?.success === "updated"
          ? "Data inventaris berhasil diperbarui."
        : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Inventaris</p>
          <h1>Rekap barang masuk dan garansi</h1>
          <p className="bodyText">Tanggal datang otomatis saat input. Status garansi dihitung dari tanggal beli dan lama garansi supplier.</p>
        </div>
        <Boxes size={30} />
      </div>

      <FlashNotice message={message} tone={searchParams?.error ? "error" : "success"} queryKeys={["error", "success"]} />

      <section className="statGrid">
        <article className="statCard"><PackagePlus size={19} /><span>Stok barang</span><strong>{stockCount}</strong></article>
        <article className="statCard"><ShieldCheck size={19} /><span>Garansi aktif</span><strong>{activeWarrantyCount}</strong></article>
        <article className="statCard"><ShieldCheck size={19} /><span>Mau habis</span><strong>{expiringWarrantyCount}</strong></article>
        <article className="statCard"><ClipboardList size={19} /><span>Problem/retur</span><strong>{problemCount}</strong></article>
      </section>

      <form className="panel formGrid" action={createInventoryItemAction}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Barang masuk</p>
            <h2>Input rekap baru</h2>
          </div>
          <PackagePlus size={22} />
        </div>

        <div className="numberGrid">
          <label>Kategori
            <select name="category" defaultValue="SSD">
              {categories.map((category) => <option value={category} key={category}>{categoryLabel(category)}</option>)}
            </select>
          </label>
          <label>Nama barang<input name="name" placeholder="SSD NVMe 256GB / Office 2021" required /></label>
        </div>

        <div className="numberGrid">
          <label>Merk / model<input name="brandModel" placeholder="Samsung PM991 / V-GeN / Microsoft" /></label>
          <label>Spek / kapasitas<input name="specification" placeholder="256GB, DDR4 8GB, 20V 3.25A" /></label>
        </div>

        <div className="numberGrid">
          <label>Serial number / SN<input name="serialNumber" placeholder="SN barang dari supplier" /></label>
          <label>Supplier / distributor<input name="supplier" placeholder="Nama distributor / toko supplier" required /></label>
        </div>

        <div className="numberGrid">
          <label>Tanggal beli<input name="purchaseDate" type="date" defaultValue={formatDateInput(new Date())} required /></label>
          <label>Harga modal<input name="costPrice" inputMode="numeric" type="number" min="0" step="1000" placeholder="0" /></label>
        </div>

        <div className="numberGrid">
          <label>Lama garansi supplier<input name="warrantyDuration" type="number" min="0" defaultValue={0} /></label>
          <label>Satuan garansi
            <select name="warrantyDurationUnit" defaultValue="MONTH">
              {warrantyUnits.map((unit) => <option value={unit} key={unit}>{warrantyUnitLabel(unit)}</option>)}
            </select>
          </label>
        </div>

        <div className="numberGrid">
          <label>Status barang
            <select name="status" defaultValue="STOCK">
              {statuses.map((status) => <option value={status} key={status}>{inventoryStatusLabel(status)}</option>)}
            </select>
          </label>
          <label>Tautkan ke unit
            <select name="unitId" defaultValue="">
              <option value="">Belum ditautkan</option>
              {units.map((unit) => <option value={unit.id} key={unit.id}>Unit {unit.nomorUnit} - {unit.model}</option>)}
            </select>
          </label>
        </div>

        <div className="numberGrid">
          <label>No invoice / nota<input name="invoiceNumber" placeholder="INV-001 / nomor nota supplier" /></label>
          <label>Link foto invoice<input name="invoiceImageUrl" placeholder="Link Drive/foto bukti pembelian" /></label>
        </div>

        <div className="numberGrid">
          <label>Pembeli / pemakai barang<input name="buyerName" placeholder="Isi kalau barang sudah untuk customer" /></label>
          <label>WA pembeli<input name="buyerPhone" placeholder="08xxxx" /></label>
        </div>

        <label>Catatan<textarea name="notes" placeholder="Contoh: klaim garansi via sales distributor A, barang dari invoice gabungan, dll." /></label>
        <button className="primaryButton" type="submit"><PackagePlus size={16} /> Simpan Barang Masuk</button>
      </form>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Rekap</p>
            <h2>Barang dan status garansi</h2>
          </div>
          <ClipboardList size={22} />
        </div>

        {items.length === 0 ? (
          <div className="emptyState">Belum ada barang masuk. Input barang pertama dari form di atas.</div>
        ) : (
          <div className="tableScroll">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Barang</th>
                  <th>Supplier & bukti</th>
                  <th>Tanggal</th>
                  <th>Garansi sistem</th>
                  <th>Status</th>
                  <th>Pemakaian</th>
                  {canEditInventory ? <th>Aksi</th> : null}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const warranty = warrantyInfo(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong><br />
                        <small>{categoryLabel(item.category)}{item.brandModel ? ` / ${item.brandModel}` : ""}{item.specification ? ` / ${item.specification}` : ""}</small><br />
                        <small>SN: {item.serialNumber || "-"}</small>
                      </td>
                      <td>
                        <strong>{item.supplier}</strong><br />
                        <small>Invoice: {item.invoiceNumber || "-"}</small><br />
                        {item.invoiceImageUrl ? <a href={item.invoiceImageUrl} target="_blank" rel="noreferrer">Buka bukti</a> : <small>Bukti belum diisi</small>}
                      </td>
                      <td>
                        <small>Beli: {formatDateWib(item.purchaseDate)}</small><br />
                        <small>Datang: {formatDateWib(item.arrivedAt)}</small>
                      </td>
                      <td>
                        <span className={`statusPill ${warranty.tone}`}>{warranty.label}</span><br />
                        <small>
                          {item.warrantyDuration} {warrantyUnitLabel(item.warrantyDurationUnit)}
                          {warranty.until ? ` / sampai ${formatDateWib(warranty.until)}` : ""}
                        </small>
                      </td>
                      <td>
                        <span className={`statusPill ${inventoryStatusTone(item.status)}`}>{inventoryStatusLabel(item.status)}</span><br />
                        {canSeePrice ? <small>{formatRupiah(item.costPrice)}</small> : null}
                      </td>
                      <td>
                        {item.unit ? <><strong>Unit {item.unit.nomorUnit}</strong><br /><small>{item.unit.model}</small></> : <small>Belum ditautkan unit</small>}
                        {item.buyerName ? <><br /><small>Pembeli: {item.buyerName}{item.buyerPhone ? ` / ${item.buyerPhone}` : ""}</small></> : null}
                        {item.createdBy ? <><br /><small>Input: {item.createdBy.name}</small></> : null}
                      </td>
                      {canEditInventory ? (
                        <td>
                          <Link className="secondaryButton" href={`/inventory/${item.id}/edit`}><Edit3 size={15} /> Edit</Link>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
