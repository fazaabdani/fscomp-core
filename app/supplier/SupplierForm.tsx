type SupplierDefaults = {
  name?: string;
  recipientName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  notes?: string;
};

export function SupplierFields({ defaults = {} }: { defaults?: SupplierDefaults }) {
  return (
    <>
      <label>Nama supplier<input name="name" defaultValue={defaults.name ?? ""} placeholder="PSI Jakarta" required maxLength={160} /></label>
      <label>Nama penerima retur<input name="recipientName" defaultValue={defaults.recipientName ?? ""} placeholder="Bagian retur / nama orangnya" maxLength={160} /></label>
      <label>Telepon penerima<input name="phone" defaultValue={defaults.phone ?? ""} inputMode="tel" placeholder="08xxxxxxxxxx" maxLength={40} /></label>
      <label>Alamat lengkap tujuan retur<textarea name="address" defaultValue={defaults.address ?? ""} required maxLength={500} placeholder="Jalan, nomor, RT/RW, kelurahan, kecamatan" /></label>
      <div className="numberGrid">
        <label>Kota / kabupaten<input name="city" defaultValue={defaults.city ?? ""} maxLength={120} /></label>
        <label>Kode pos<input name="postalCode" defaultValue={defaults.postalCode ?? ""} inputMode="numeric" maxLength={10} /></label>
      </div>
      <label>Catatan (ekspedisi, jam terima, dll.)<textarea name="notes" defaultValue={defaults.notes ?? ""} maxLength={500} /></label>
    </>
  );
}

export function supplierErrorMessage(error?: string) {
  if (error === "duplicate") return "Nama supplier itu sudah terdaftar.";
  if (error === "invalid-input") return "Data belum valid. Nama dan alamat wajib diisi.";
  return "";
}
