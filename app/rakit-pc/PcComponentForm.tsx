"use client";

import { useState } from "react";
import { createPcComponentAction } from "./actions";

type InventoryOption={id:string;name:string;brandModel:string|null;serialNumber:string|null};
const categories=["CPU","MOTHERBOARD","RAM","STORAGE","GPU","PSU","CASING","COOLER","MONITOR","ACCESSORY"];
const labels:Record<string,string>={CPU:"Processor",MOTHERBOARD:"Motherboard",RAM:"RAM",STORAGE:"Storage",GPU:"Kartu grafis",PSU:"Power supply",CASING:"Casing",COOLER:"Cooler",MONITOR:"Monitor",ACCESSORY:"Aksesori"};

export function PcComponentForm({inventory}:{inventory:InventoryOption[]}){
  const [category,setCategory]=useState("CPU");
  const show=(...values:string[])=>values.includes(category);
  return <form className="panel formGrid" action={createPcComponentAction}><div className="panelHeader"><div><p className="eyebrow">Katalog komponen</p><h2>Tambah komponen</h2><p>Pilih kategori dahulu. Field kompatibilitas akan menyesuaikan otomatis.</p></div></div><div className="formGrid twoColumns">
    <label>Kategori<select name="category" value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(item=><option value={item} key={item}>{labels[item]}</option>)}</select></label><label>Nama<input name="name" required placeholder="AMD Ryzen 5 7600"/></label><label>Merek<input name="brand" placeholder="AMD"/></label><label>Harga jual<input name="salePrice" type="number" min="0" step="1000" required/></label><label>Item Inventaris<select name="inventoryItemId"><option value="">Katalog manual / pre-order</option>{inventory.map(item=><option value={item.id} key={item.id}>{item.name} {item.brandModel} {item.serialNumber?`/ SN ${item.serialNumber}`:""}</option>)}</select><small>Jika ditautkan, item hilang dari publik saat status inventaris bukan STOCK.</small></label>
    {show("CPU","MOTHERBOARD")?<label>Socket<input name="socket" placeholder="AM5 / LGA1700" required/></label>:null}
    {show("COOLER")?<label>Socket yang didukung<input name="supportedSockets" placeholder="AM4, AM5, LGA1700"/><small>Pisahkan dengan koma.</small></label>:null}
    {show("CPU","MOTHERBOARD","RAM")?<label>Tipe memori<input name="memoryType" placeholder="DDR4 / DDR5" required/></label>:null}
    {show("MOTHERBOARD")?<><label>Form factor<input name="formFactor" placeholder="ATX / mATX / ITX" required/></label><label>Interface storage didukung<input name="supportedStorageInterfaces" placeholder="NVME GEN4, SATA"/></label></>:null}
    {show("STORAGE")?<label>Interface storage<input name="storageInterface" placeholder="NVME GEN4 / SATA"/></label>:null}
    {show("CPU","MOTHERBOARD","RAM","STORAGE","GPU","CASING","COOLER","MONITOR","ACCESSORY")?<label>Konsumsi daya / TDP<input name="powerDraw" type="number" min="0" placeholder="105"/><small>Dipakai untuk estimasi total beban PSU.</small></label>:null}
    {show("PSU")?<label>Kapasitas PSU<input name="psuCapacity" type="number" min="0" placeholder="650" required/></label>:null}
    {show("GPU")?<label>Panjang GPU (mm)<input name="gpuLengthMm" type="number" min="0" placeholder="300"/></label>:null}
    {show("CASING")?<><label>Form factor didukung<input name="supportedFormFactors" placeholder="ATX, mATX, ITX" required/><small>Pisahkan dengan koma.</small></label><label>Maks. panjang GPU (mm)<input name="maxGpuLengthMm" type="number" min="0" placeholder="360"/></label><label>Maks. tinggi cooler (mm)<input name="maxCoolerHeightMm" type="number" min="0" placeholder="165"/></label><label>Radiator didukung (mm)<input name="supportedRadiatorSizes" placeholder="120, 240, 280, 360"/></label></>:null}
    {show("COOLER")?<><label>Tinggi cooler (mm)<input name="coolerHeightMm" type="number" min="0" placeholder="157"/></label><label>Ukuran radiator (mm)<input name="radiatorSizeMm" type="number" min="0" placeholder="240, kosongkan untuk air cooler"/></label></>:null}
    <label className="wideField">Spesifikasi tampilan<textarea name="specification" placeholder="Contoh: 6-core · AM5 · 65W"/></label>
  </div><div className="infoBox">Field kosong berarti kompatibilitas tersebut belum dapat dipastikan. Lengkapi data teknis penting agar filter publik akurat.</div><button className="primaryButton" type="submit">Tambah Komponen</button></form>;
}
