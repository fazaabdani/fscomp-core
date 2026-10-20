"use client";

import { Cpu, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import "./non-laptop-items.css";

export type StockOption = { id: string; name: string; serialNumber: string; costPrice: number; warranty: string };

type Row = {
  key: number;
  name: string;
  inventoryId: string;
  category: string;
  qty: string;
  price: string;
  cost: string;
  serial: string;
  warranty: string;
};

const CATEGORIES: [string, string][] = [
  ["LISENSI", "Lisensi"],
  ["SOFTWARE", "Software"],
  ["AKSESORI", "Aksesori"],
  ["SPAREPART", "Sparepart"],
  ["JASA", "Jasa"],
  ["LAINNYA", "Lainnya"]
];

// Daftar komponen umum PC rakitan; kasir tinggal isi modal, S/N, dan garansi.
const PC_TEMPLATE: { name: string; category: string }[] = [
  { name: "Processor", category: "SPAREPART" },
  { name: "Motherboard", category: "SPAREPART" },
  { name: "RAM", category: "SPAREPART" },
  { name: "VGA / graphics card", category: "SPAREPART" },
  { name: "SSD", category: "SPAREPART" },
  { name: "Power supply (PSU)", category: "SPAREPART" },
  { name: "Casing", category: "SPAREPART" },
  { name: "CPU cooler", category: "SPAREPART" },
  { name: "Monitor", category: "SPAREPART" },
  { name: "UPS", category: "SPAREPART" },
  { name: "Windows + Office", category: "LISENSI" }
];

let nextKey = 100;
const blankRow = (name = "", category = "SPAREPART", qty = "0"): Row => ({ key: nextKey++, name, inventoryId: "", category, qty, price: "0", cost: "0", serial: "", warranty: "" });

const initialRows = (): Row[] => [
  blankRow("Microsoft Office", "LISENSI"),
  blankRow("Windows", "LISENSI"),
  blankRow("", "AKSESORI"),
  blankRow("", "SPAREPART"),
  blankRow("", "JASA"),
  blankRow("", "LAINNYA")
];

const rupiah = (value: number) => `Rp ${Math.round(value).toLocaleString("id-ID")}`;
const num = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function NonLaptopItems({ stockItems }: { stockItems: StockOption[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [pkg, setPkg] = useState(false);
  const [packageName, setPackageName] = useState("Paket PC rakitan");
  const [packagePrice, setPackagePrice] = useState("");
  const stockById = useMemo(() => new Map(stockItems.map((item) => [item.id, item])), [stockItems]);

  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const remove = (key: number) => setRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  const add = () => setRows((current) => (current.length >= 40 ? current : [...current, blankRow("", pkg ? "SPAREPART" : "LAINNYA", pkg ? "1" : "0")]));
  const applyTemplate = () => setRows(PC_TEMPLATE.map((item) => blankRow(item.name, item.category, "1")));

  function pickInventory(row: Row, inventoryId: string) {
    const stock = inventoryId ? stockById.get(inventoryId) : undefined;
    if (!stock) {
      update(row.key, { inventoryId: "" });
      return;
    }
    update(row.key, {
      inventoryId,
      name: stock.name,
      qty: "1",
      cost: stock.costPrice > 0 ? String(stock.costPrice) : row.cost,
      serial: stock.serialNumber || row.serial,
      warranty: stock.warranty || row.warranty
    });
  }

  function togglePackage(on: boolean) {
    setPkg(on);
    // Baru dinyalakan dan belum ada isian: langsung beri kerangka komponen PC.
    if (on && rows.every((row) => num(row.qty) === 0 && !row.inventoryId)) applyTemplate();
  }

  const active = rows.filter((row) => row.name.trim() && (row.inventoryId || num(row.qty) > 0));
  const totalCost = active.reduce((sum, row) => sum + (row.inventoryId ? 1 : num(row.qty)) * num(row.cost), 0);
  const revenue = pkg ? num(packagePrice) : active.reduce((sum, row) => sum + (row.inventoryId ? 1 : num(row.qty)) * num(row.price), 0);
  const estimatedProfit = revenue - totalCost;

  return (
    <div className="panelSubsection cashierItems nlItems">
      <div className="nlItemsTop">
        <div>
          <p className="eyebrow">Daftar Item</p>
          <h3>Barang atau layanan yang dijual</h3>
        </div>
        <label className="checkTile nlPackageToggle">
          <input type="checkbox" name="packageMode" checked={pkg} onChange={(event) => togglePackage(event.target.checked)} />
          <span><strong>Penjualan paket (PC rakitan)</strong><small>Nota hanya menampilkan total paket + daftar komponen dengan S/N dan garansi</small></span>
        </label>
      </div>

      {pkg ? (
        <div className="nlPackageBox">
          <label>Nama paket<input name="packageName" value={packageName} onChange={(event) => setPackageName(event.target.value)} maxLength={120} placeholder="Paket PC rakitan Ryzen 5 + RTX 4060" /></label>
          <label>Harga paket (total, Rp)<input name="packagePrice" type="number" inputMode="numeric" min="0" step="1000" value={packagePrice} onChange={(event) => setPackagePrice(event.target.value)} placeholder="Contoh: 34500000" /></label>
          <button type="button" className="secondaryButton compactButton" onClick={applyTemplate}><Cpu size={15} /> Isi template komponen PC</button>
        </div>
      ) : null}

      <div className="nlRows">
        {rows.map((row, index) => (
          <div className="nlRow" key={row.key}>
            <label className="nlName">Item {index + 1}
              <input name="itemName" value={row.name} onChange={(event) => update(row.key, { name: event.target.value })} placeholder="Nama barang/layanan" />
            </label>
            <label className="nlInv">Stok inventaris
              <select name="itemInventoryId" value={row.inventoryId} onChange={(event) => pickInventory(row, event.target.value)}>
                <option value="">Tidak terhubung inventaris</option>
                {stockItems.map((stock) => (
                  <option value={stock.id} key={stock.id}>{stock.name}{stock.serialNumber ? ` (${stock.serialNumber})` : ""}</option>
                ))}
              </select>
            </label>
            <label>Kategori
              <select name="itemCategory" value={row.category} onChange={(event) => update(row.key, { category: event.target.value })}>
                {CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label>Qty
              <input name="itemQty" type="number" min="0" value={row.inventoryId ? "1" : row.qty} readOnly={Boolean(row.inventoryId)} onChange={(event) => update(row.key, { qty: event.target.value })} />
            </label>
            {pkg ? (
              <input name="itemPrice" type="hidden" value="0" />
            ) : (
              <label>Jual/pcs
                <input name="itemPrice" type="number" inputMode="numeric" min="0" step="1000" value={row.price} onChange={(event) => update(row.key, { price: event.target.value })} />
              </label>
            )}
            <label>Modal/pcs <b className="nlRequired">wajib</b>
              <input name="itemCost" type="number" inputMode="numeric" min="0" step="1000" value={row.cost} onChange={(event) => update(row.key, { cost: event.target.value })} />
            </label>
            <label>Serial number
              <input name="itemSerial" value={row.serial} onChange={(event) => update(row.key, { serial: event.target.value })} maxLength={80} placeholder="S/N (opsional)" />
            </label>
            <label>Garansi
              <input name="itemWarranty" value={row.warranty} onChange={(event) => update(row.key, { warranty: event.target.value })} maxLength={60} placeholder="mis. 3 tahun" />
            </label>
            <button type="button" className="iconButton nlRemove" onClick={() => remove(row.key)} aria-label={`Hapus item ${index + 1}`} title="Hapus baris"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <div className="nlFooter">
        <button type="button" className="secondaryButton compactButton" onClick={add}><Plus size={15} /> Tambah baris</button>
        <div className="nlSummary" aria-live="polite">
          <span>Modal komponen <strong>{rupiah(totalCost)}</strong></span>
          <span>{pkg ? "Harga paket" : "Omzet item"} <strong>{rupiah(revenue)}</strong></span>
          <span>Estimasi laba <strong className={estimatedProfit < 0 ? "nlLoss" : ""}>{rupiah(estimatedProfit)}</strong></span>
        </div>
      </div>

      <small className="formHint">
        Item dengan qty 0 tidak ikut nota. Kalau ditautkan ke inventaris, qty otomatis 1 dan nama, modal, S/N, serta garansi terisi dari data inventaris.
        Item berharga jual wajib punya modal (kecuali kategori Jasa). Estimasi laba belum dikurangi bonus tas/mouse dan potongan marketplace.
      </small>
      <label className="checkTile"><input type="checkbox" name="confirmZeroCost" /> Modal item memang Rp 0 (gratis / tanpa modal)</label>
    </div>
  );
}
