import Link from "next/link";
import { Edit3, Save } from "lucide-react";
import type { InventoryItemStatus, WarrantyDurationUnit } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateInput, formatDateWib, inventoryStatusLabel, warrantyInfo, warrantyUnitLabel } from "@/lib/inventory";
import { requireRole } from "@/lib/session";
import { updateInventoryItemAction } from "../../actions";

const categories = ["SSD", "RAM", "CHARGER", "BATERAI", "LCD", "KEYBOARD", "AKSESORIS", "LAINNYA"];
const statuses: InventoryItemStatus[] = ["STOCK", "USED_IN_UNIT", "SOLD", "RETURNED", "DAMAGED", "LOST"];
const warrantyUnits: WarrantyDurationUnit[] = ["DAY", "WEEK", "MONTH", "YEAR"];

function categoryLabel(category: string) {
  if (category === "LAINNYA") return "Lainnya";
  return category;
}

export default async function EditInventoryItemPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { error?: string };
}) {
  requireRole(["admin", "sales"]);

  const [item, units] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id: params.id } }),
    prisma.unit.findMany({
      where: { soldAt: null },
      select: { id: true, nomorUnit: true, model: true },
      orderBy: [{ nomorUnit: "asc" }]
    })
  ]);

  if (!item) notFound();

  const warranty = warrantyInfo(item);

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Inventaris</p>
          <h1>Edit barang</h1>
          <p className="bodyText">Tanggal datang tetap {formatDateWib(item.arrivedAt)}. Status garansi dihitung ulang otomatis dari tanggal beli dan lama garansi.</p>
        </div>
        <Edit3 size={28} />
      </div>

      {searchParams?.error === "required" ? <div className="infoBox dangerInfo">Nama barang, supplier, dan tanggal beli wajib diisi.</div> : null}

      <form className="panel formGrid" action={updateInventoryItemAction.bind(null, item.id)}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Data barang</p>
            <h2>{item.name}</h2>
          </div>
          <span className={`statusPill ${warranty.tone}`}>{warranty.label}</span>
        </div>

        <div className="numberGrid">
          <label>Kategori
            <select name="category" defaultValue={item.category}>
              {categories.map((category) => <option value={category} key={category}>{categoryLabel(category)}</option>)}
            </select>
          </label>
          <label>Nama barang<input name="name" defaultValue={item.name} required /></label>
        </div>

        <div className="numberGrid">
          <label>Merk / model<input name="brandModel" defaultValue={item.brandModel ?? ""} /></label>
          <label>Spek / kapasitas<input name="specification" defaultValue={item.specification ?? ""} /></label>
        </div>

        <div className="numberGrid">
          <label>Serial number / kode<input name="serialNumber" defaultValue={item.serialNumber ?? ""} /></label>
          <label>Supplier / distributor<input name="supplier" defaultValue={item.supplier} required /></label>
        </div>

        <div className="numberGrid">
          <label>Tanggal beli<input name="purchaseDate" type="date" defaultValue={formatDateInput(item.purchaseDate)} required /></label>
          <label>Harga modal<input name="costPrice" inputMode="numeric" type="number" min="0" step="1000" defaultValue={item.costPrice} /></label>
        </div>

        <div className="numberGrid">
          <label>Lama garansi supplier<input name="warrantyDuration" type="number" min="0" defaultValue={item.warrantyDuration} /></label>
          <label>Satuan garansi
            <select name="warrantyDurationUnit" defaultValue={item.warrantyDurationUnit}>
              {warrantyUnits.map((unit) => <option value={unit} key={unit}>{warrantyUnitLabel(unit)}</option>)}
            </select>
          </label>
        </div>

        <div className="numberGrid">
          <label>Status barang
            <select name="status" defaultValue={item.status}>
              {statuses.map((status) => <option value={status} key={status}>{inventoryStatusLabel(status)}</option>)}
            </select>
          </label>
          <label>Tautkan ke unit
            <select name="unitId" defaultValue={item.unitId ?? ""}>
              <option value="">Belum ditautkan</option>
              {units.map((unit) => <option value={unit.id} key={unit.id}>Unit {unit.nomorUnit} - {unit.model}</option>)}
            </select>
          </label>
        </div>

        <div className="numberGrid">
          <label>No invoice / nota<input name="invoiceNumber" defaultValue={item.invoiceNumber ?? ""} /></label>
          <label>Link foto invoice<input name="invoiceImageUrl" defaultValue={item.invoiceImageUrl ?? ""} /></label>
        </div>

        <div className="numberGrid">
          <label>Pembeli / pemakai barang<input name="buyerName" defaultValue={item.buyerName ?? ""} /></label>
          <label>WA pembeli<input name="buyerPhone" defaultValue={item.buyerPhone ?? ""} /></label>
        </div>

        <label>Catatan<textarea name="notes" defaultValue={item.notes ?? ""} /></label>

        <div className="buttonRow">
          <button className="primaryButton" type="submit"><Save size={16} /> Simpan Perubahan</button>
          <Link className="secondaryButton" href="/inventory">Kembali</Link>
        </div>
      </form>
    </section>
  );
}
