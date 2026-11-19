import { SPAREPART_CATEGORIES } from "@/lib/sparepart";

export type SparepartFormValues = {
  category: string;
  name: string;
  brand: string | null;
  spec: string | null;
  sizeInch: string | null;
  resolution: string | null;
  pins: string | null;
  thickness: string | null;
  compat: string | null;
  qty: number;
  minQty: number;
  costPrice: number;
  salePrice: number | null;
  location: string | null;
  shared: boolean;
  notes: string | null;
};

// Formulir yang sama dipakai untuk tambah dan ubah. showCost=false menyembunyikan harga modal dari yang bukan admin.
export function SparepartFields({ v, showCost, isEdit, defaultCategory }: { v?: SparepartFormValues; showCost: boolean; isEdit?: boolean; defaultCategory?: string }) {
  return (
    <>
      <div className="spGrid">
        <label>Kategori
          <select name="category" defaultValue={v?.category ?? defaultCategory ?? "LED"}>
            {SPAREPART_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label>Nama barang
          <input name="name" required defaultValue={v?.name ?? ""} placeholder="LED 14.0 slim 30 pin FHD" />
        </label>
        <label>Jumlah {isEdit ? "(koreksi stok)" : "stok awal"}
          <input name="qty" type="number" inputMode="numeric" min="0" defaultValue={v?.qty ?? 1} />
        </label>
        <label>Rak / lokasi
          <input name="location" defaultValue={v?.location ?? ""} placeholder="Rak A2 / Wiradesa" />
        </label>
      </div>

      <div className="spGrid">
        <label>Merk <input name="brand" defaultValue={v?.brand ?? ""} placeholder="BOE / LG / Samsung" /></label>
        <label>Spek singkat <input name="spec" defaultValue={v?.spec ?? ""} placeholder="IPS, 60Hz" /></label>
        <label>Ukuran (inci) <input name="sizeInch" defaultValue={v?.sizeInch ?? ""} placeholder="14.0" /></label>
        <label>Jumlah pin <input name="pins" defaultValue={v?.pins ?? ""} placeholder="30 pin" /></label>
        <label>Resolusi <input name="resolution" defaultValue={v?.resolution ?? ""} placeholder="FHD / HD" /></label>
        <label>Ketebalan <input name="thickness" defaultValue={v?.thickness ?? ""} placeholder="Slim / Standar" /></label>
      </div>
      <p className="hint" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
        Untuk kategori LED, ukuran, pin, resolusi, dan ketebalan terisi otomatis dari nama bila dikosongkan.
      </p>

      <label>Cocok untuk (model laptop, pisahkan dengan koma)
        <input name="compat" defaultValue={v?.compat ?? ""} placeholder="Acer Aspire 3 A314, Asus X441, Lenovo IdeaPad 330" />
      </label>

      <div className="spGrid">
        {showCost ? <label>Modal per pcs (Rp) <input name="costPrice" type="number" inputMode="numeric" min="0" step="1000" defaultValue={v?.costPrice ?? 0} /></label> : <input type="hidden" name="costPrice" value={v?.costPrice ?? 0} />}
        <label>Harga jual per pcs (Rp) <input name="salePrice" type="number" inputMode="numeric" min="0" step="1000" defaultValue={v?.salePrice ?? ""} /></label>
        <label>Ingatkan bila stok kurang dari <input name="minQty" type="number" inputMode="numeric" min="0" defaultValue={v?.minQty ?? 2} /></label>
      </div>

      {isEdit ? <label>Alasan koreksi stok (opsional) <input name="reason" placeholder="Hitung ulang / rusak / retur" /></label> : null}
      <label>Catatan internal <input name="notes" defaultValue={v?.notes ?? ""} /></label>
      <label className="spCheck">
        <input type="checkbox" name="shared" defaultChecked={v?.shared ?? true} />
        Tampilkan di link berbagi (harga modal tidak pernah ditampilkan)
      </label>
    </>
  );
}
