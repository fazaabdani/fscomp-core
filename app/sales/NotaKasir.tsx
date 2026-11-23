"use client";

import { useMemo, useState } from "react";
import { Calendar, Globe, Laptop2, MapPin, Phone, Plus, QrCode } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { LeadSourceSubmit } from "./LeadSourceSubmit";
import type { storeByLocation } from "@/lib/sale-receipt-data";

type Unit = {
  id: string;
  nomorUnit: string;
  model: string;
  processor: string;
  ram: string;
  ssd: string;
  stockLocation: string;
  hargaJualRekomendasi: number;
};

type Row = { name: string; category: string; qty: number; price: number; cost: number };

type Store = (typeof storeByLocation)[keyof typeof storeByLocation];

const DEFAULT_ROWS: Row[] = [
  { name: "Tas laptop", category: "BONUS", qty: 1, price: 0, cost: 0 },
  { name: "Mouse wireless", category: "BONUS", qty: 1, price: 0, cost: 0 },
  { name: "Microsoft Office", category: "SOFTWARE", qty: 1, price: 0, cost: 0 },
  { name: "", category: "LAINNYA", qty: 0, price: 0, cost: 0 }
];

function Eyebrow({ children }: { children: string }) {
  return (
    <div className="notaEyebrow">
      <span>{children}</span>
      <i />
    </div>
  );
}

const num = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export function NotaKasir({
  units,
  marketplaces,
  stores,
  todayLabel
}: {
  units: Unit[];
  marketplaces: readonly string[];
  stores: { WIRADESA: Store; KAJEN: Store };
  todayLabel: string;
}) {
  const first = units[0];
  const [unitId, setUnitId] = useState(first?.id ?? "");
  const [location, setLocation] = useState<"WIRADESA" | "KAJEN">(first?.stockLocation === "Kajen" ? "KAJEN" : "WIRADESA");
  const [soldPrice, setSoldPrice] = useState(first?.hargaJualRekomendasi ?? 0);
  const [method, setMethod] = useState("Cash");
  const [dp, setDp] = useState(0);
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [swAmount, setSwAmount] = useState(3);
  const [swUnit, setSwUnit] = useState("bulan");
  const [hwAmount, setHwAmount] = useState(3);
  const [hwUnit, setHwUnit] = useState("minggu");

  const unit = units.find((u) => u.id === unitId);
  const store = stores[location];

  function selectUnit(id: string) {
    setUnitId(id);
    const next = units.find((u) => u.id === id);
    setSoldPrice(next?.hargaJualRekomendasi ?? 0);
    setLocation(next?.stockLocation === "Kajen" ? "KAJEN" : "WIRADESA");
  }
  function setRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const subtotal = useMemo(() => soldPrice + rows.reduce((sum, r) => sum + r.qty * r.price, 0), [soldPrice, rows]);
  const paidNow = method === "DP" ? Math.min(dp, subtotal) : subtotal;
  const remaining = Math.max(0, subtotal - paidNow);

  return (
    <article className="notaSheet notaForm">
      <div className="notaHeaderRow">
        <div className="notaBrandBlock">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={location === "KAJEN" ? "notaLogo notaLogoRound" : "notaLogo"} src={store.logo} alt={store.name} />
          {location === "KAJEN" ? null : (
            <>
              <h2 className="notaBrandName">{store.name}</h2>
              <p className="notaBrandSlogan">{store.slogan}</p>
            </>
          )}
        </div>

        <div className="notaContactBlock">
          <div className="notaContactLine"><Laptop2 size={15} /><span><strong>{store.tagline}</strong><br />{store.branch}</span></div>
          <div className="notaContactLine"><MapPin size={15} /><span>{store.address}</span></div>
          <div className="notaContactLine"><Phone size={15} /><span>WA: {store.phone}</span></div>
          <div className="notaContactLine"><Globe size={15} /><span>{store.website}</span></div>
        </div>

        <div className="notaInvoiceBlock">
          <Eyebrow>NOTA PENJUALAN</Eyebrow>
          <h1 className="notaInvoiceNumber nfInvoicePending">No. nota otomatis</h1>
          <div className="notaInvoiceMeta"><Calendar size={14} /><span>{todayLabel}</span></div>
          <label className="notaInvoiceMeta nfInline">
            <MapPin size={14} />
            <select className="nf" name="location" value={location} onChange={(e) => setLocation(e.target.value as "WIRADESA" | "KAJEN")} aria-label="Lokasi transaksi dan kop nota">
              <option value="WIRADESA">Wiradesa / FS Comp</option>
              <option value="KAJEN">Kajen / FS.ID</option>
            </select>
          </label>
        </div>

        <div className="notaQrBlock nfQr" title="QR nota muncul setelah disimpan"><QrCode size={52} strokeWidth={1.3} /></div>
      </div>

      <div className="notaDivider" aria-hidden="true" />

      <div className="notaInfoGrid">
        <div className="nfCol">
          <Eyebrow>PEMBELI</Eyebrow>
          <input className="nf nfStrong" name="buyerName" placeholder="Nama pembeli" aria-label="Nama pembeli" />
          <input className="nf" name="buyerPhone" placeholder="No. WhatsApp (08xxxxxxxxxx)" aria-label="No. WhatsApp pembeli" inputMode="tel" />
          <input className="nf" name="buyerAddress" placeholder="Alamat (untuk nota)" aria-label="Alamat pembeli" />
        </div>
        <div className="nfCol">
          <Eyebrow>PEMBAYARAN</Eyebrow>
          <select className="nf nfStrong" name="paymentMethod" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Metode bayar">
            <option>Cash</option>
            <option>Transfer</option>
            <option>DP</option>
          </select>
          {method === "DP" ? (
            <label className="nfLine">DP masuk
              <input className="nf nfNum" name="dpAmount" type="number" inputMode="numeric" min="0" step="1000" value={dp || ""} onChange={(e) => setDp(num(e.target.value))} placeholder="0" />
            </label>
          ) : <input type="hidden" name="dpAmount" value="" />}
          <small className="nfSum">{remaining > 0 ? `Sisa ${formatRupiah(remaining)}` : "Lunas"}</small>
          <label className="nfLine">Channel
            <select className="nf" name="marketplaceName" defaultValue="">
              <option value="">Langsung (toko)</option>
              {marketplaces.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="nfLine">Potongan admin
            <input className="nf nfNum" name="marketplaceFee" type="number" inputMode="numeric" min="0" step="1000" placeholder="Rp, hanya marketplace" />
          </label>
        </div>
        <div className="nfCol">
          <Eyebrow>GARANSI</Eyebrow>
          <div className="nfPair">
            <span>Software</span>
            <input className="nf nfNum nfShort" name="warrantySoftwareAmount" type="number" min="1" value={swAmount} onChange={(e) => setSwAmount(Math.max(1, num(e.target.value)))} aria-label="Garansi software" />
            <select className="nf" name="warrantySoftwareUnit" value={swUnit} onChange={(e) => setSwUnit(e.target.value)} aria-label="Periode garansi software">
              <option value="minggu">minggu</option><option value="bulan">bulan</option>
            </select>
          </div>
          <div className="nfPair">
            <span>Hardware</span>
            <input className="nf nfNum nfShort" name="warrantyHardwareAmount" type="number" min="1" value={hwAmount} onChange={(e) => setHwAmount(Math.max(1, num(e.target.value)))} aria-label="Garansi hardware" />
            <select className="nf" name="warrantyHardwareUnit" value={hwUnit} onChange={(e) => setHwUnit(e.target.value)} aria-label="Periode garansi hardware">
              <option value="minggu">minggu</option><option value="bulan">bulan</option>
            </select>
          </div>
        </div>
      </div>

      <div className="notaUnitBanner nfUnit">
        <span className="notaUnitIcon"><Laptop2 size={18} /></span>
        <div>
          <select className="nf nfStrong" name="unitId" value={unitId} onChange={(e) => selectUnit(e.target.value)} aria-label="Pilih unit laptop" required>
            {units.length === 0 ? <option value="">Belum ada unit siap jual</option> : null}
            {units.map((u) => (
              <option value={u.id} key={u.id}>Unit {u.nomorUnit} · {u.model} · stok {u.stockLocation}</option>
            ))}
          </select>
          <span>{unit ? `${unit.processor} / RAM ${unit.ram} / ${unit.ssd}` : "Pilih unit untuk melihat spesifikasi"}</span>
        </div>
      </div>

      <div className="nfTableWrap">
        <div className="notaTable nfTable">
          <div className="notaTableHead nfRow">
            <span>Item</span><span>Qty</span><span>Harga</span><span>Total</span><span className="nfCostHead">Modal/pcs</span>
          </div>
          <div className="notaTableRow nfRow">
            <span>
              <strong>{unit ? `Laptop ${unit.model}` : "Laptop"}</strong>
              <small>LAPTOP</small>
            </span>
            <span>1</span>
            <span><input className="nf nfNum" name="soldPrice" type="number" inputMode="numeric" min="0" step="1000" value={soldPrice || ""} onChange={(e) => setSoldPrice(num(e.target.value))} placeholder="Harga jual" aria-label="Harga jual final laptop" required /></span>
            <span>{formatRupiah(soldPrice)}</span>
            <span className="nfCostCell">modal dari unit</span>
          </div>
          {rows.map((row, i) => (
            <div className="notaTableRow nfRow" key={i}>
              <span className="nfItemCell">
                <input className="nf nfStrong" name="itemName" value={row.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Item tambahan (bonus, software, aksesoris)" aria-label="Nama item" />
                <input className="nf nfTiny" name="itemCategory" value={row.category} onChange={(e) => setRow(i, { category: e.target.value.toUpperCase() })} aria-label="Kategori item" />
              </span>
              <span><input className="nf nfNum" name="itemQty" type="number" min="0" value={row.qty} onChange={(e) => setRow(i, { qty: num(e.target.value) })} aria-label="Qty" /></span>
              <span><input className="nf nfNum" name="itemPrice" type="number" inputMode="numeric" min="0" step="1000" value={row.price} onChange={(e) => setRow(i, { price: num(e.target.value) })} aria-label="Harga jual per pcs" /></span>
              <span>{formatRupiah(row.qty * row.price)}</span>
              <span className="nfCostCell"><input className="nf nfNum" name="itemCost" type="number" inputMode="numeric" min="0" step="1000" value={row.cost} onChange={(e) => setRow(i, { cost: num(e.target.value) })} aria-label="Modal per pcs (tidak tercetak)" /></span>
            </div>
          ))}
        </div>
      </div>
      <div className="nfTableTools">
        <button type="button" className="secondaryButton nfAdd" onClick={() => setRows((c) => [...c, { name: "", category: "LAINNYA", qty: 1, price: 0, cost: 0 }])}>
          <Plus size={15} /> Tambah baris item
        </button>
        <label className="nfCheck"><input type="checkbox" name="confirmZeroCost" /> Modal item tambahan memang Rp 0 (gratis)</label>
        <small>Qty 0 = baris tidak ikut. Kolom Modal tidak tercetak di nota, tapi wajib diisi untuk item yang dijual berharga.</small>
      </div>

      <div className="notaFooterRow">
        <div className="notaTermsBlock">
          <Eyebrow>KETENTUAN GARANSI</Eyebrow>
          <p>
            Garansi software {swAmount} {swUnit} dan hardware {hwAmount} {hwUnit} berlaku sesuai hasil QC
            dan pemakaian normal. Data pribadi pembeli disarankan dicadangkan mandiri.
          </p>
          <input className="nf" name="notes" placeholder="Catatan untuk nota (opsional): DP, transfer BCA, aksesoris tambahan" aria-label="Catatan" />
          <details className="nfLicense">
            <summary>Data lisensi (Office, Windows, antivirus) <small>opsional, bisa diisi nanti di menu Lisensi</small></summary>
            <div className="nfLicenseGrid">
              <label>Tipe
                <select className="nf" name="licenseType" defaultValue="AUTO">
                  <option value="AUTO">Otomatis dari item</option>
                  <option value="OFFICE">Office</option>
                  <option value="WINDOWS">Windows</option>
                  <option value="ANTIVIRUS">Antivirus</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </label>
              <label>Versi<input className="nf" name="licenseVersion" defaultValue="2021" placeholder="Office 2021 / Windows 11 Pro" /></label>
              <label>Durasi
                <select className="nf" name="licenseDurationType" defaultValue="LIFETIME">
                  <option value="LIFETIME">Lifetime</option>
                  <option value="YEARLY">Tahunan</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </label>
              <label>Berlaku sampai<input className="nf" name="licenseValidUntil" type="date" /></label>
              <label className="nfWide">Product key<input className="nf" name="licenseProductKey" placeholder="Opsional" /></label>
            </div>
          </details>
        </div>
        <div className="notaTotalBox">
          <span>TOTAL PEMBAYARAN</span>
          <strong>{formatRupiah(subtotal)}</strong>
          <em>{remaining > 0 ? `Sisa ${formatRupiah(remaining)}` : "Lunas"}</em>
        </div>
      </div>

      <div className="notaBankRow">
        <p className="notaBankRowLabel">Rekening transaksi {store.name}</p>
        <div className="notaBankList">
          <span><strong>BCA</strong> 251-029-8724</span>
          <span><strong>MANDIRI</strong> 139-00-1590821-7</span>
          <span><strong>BRI</strong> 0325-01-017004538</span>
          <span><strong>DANA / OVO / GOPAY</strong> 0816692428</span>
          <span className="notaBankOwner">a.n. Faza Abdani Auni Robbi</span>
        </div>
      </div>

      <div className="nfSubmitBar">
        <span>{units.length === 0 ? "Belum ada unit siap jual." : "Periksa kembali, lalu simpan. Nota langsung dibuat."}</span>
        <LeadSourceSubmit label="Simpan Penjualan" pendingLabel="Menyimpan transaksi..." />
      </div>
    </article>
  );
}
