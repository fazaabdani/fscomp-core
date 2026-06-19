"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, TriangleAlert } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { createPcBuildDraftAction } from "./actions";

type Component = { id: string; category: string; name: string; brand: string | null; specification: string | null; salePrice: number; socket: string | null; memoryType: string | null; formFactor: string | null; wattage: number | null; inventoryItemId: string | null };
type Preset = { id: string; name: string; slug: string; description: string | null; useCase: string; items: { componentId: string }[] };
const categories = ["CPU", "MOTHERBOARD", "RAM", "STORAGE", "GPU", "PSU", "CASING", "COOLER", "MONITOR", "ACCESSORY"];
const pcCategoryLabels: Record<string, string> = { CPU:"Processor",MOTHERBOARD:"Motherboard",RAM:"RAM",STORAGE:"Storage",GPU:"Kartu grafis",PSU:"Power supply",CASING:"Casing",COOLER:"Cooler",MONITOR:"Monitor",ACCESSORY:"Aksesori" };

export function PcBuilder({ components, presets, draftCode }: { components: Component[]; presets: Preset[]; draftCode?: string }) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [presetName, setPresetName] = useState("");
  const selectedComponents = useMemo(() => Object.values(selected).map((id) => components.find((item) => item.id === id)).filter(Boolean) as Component[], [components, selected]);
  const total = selectedComponents.reduce((sum, item) => sum + item.salePrice, 0);
  const byCategory = (category: string) => components.filter((item) => item.category === category);
  const chosen = (category: string) => selectedComponents.find((item) => item.category === category);
  const warnings: string[] = [];
  const cpu = chosen("CPU"), motherboard = chosen("MOTHERBOARD"), ram = chosen("RAM"), psu = chosen("PSU"), gpu = chosen("GPU"), casing = chosen("CASING");
  const requiredCategories = ["CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASING"];
  const missingCategories = requiredCategories.filter((category) => !chosen(category));
  const formFactorFits = !casing?.formFactor || !motherboard?.formFactor || casing.formFactor === motherboard.formFactor || (casing.formFactor === "ATX" && ["MATX", "MICRO-ATX", "ITX"].includes(motherboard.formFactor.toUpperCase())) || (["MATX", "MICRO-ATX"].includes(casing.formFactor.toUpperCase()) && motherboard.formFactor.toUpperCase() === "ITX");
  if (cpu?.socket && motherboard?.socket && cpu.socket !== motherboard.socket) warnings.push(`Socket CPU ${cpu.socket} tidak cocok dengan motherboard ${motherboard.socket}.`);
  if (ram?.memoryType && motherboard?.memoryType && ram.memoryType !== motherboard.memoryType) warnings.push(`${ram.memoryType} tidak cocok dengan motherboard ${motherboard.memoryType}.`);
  if (!formFactorFits) warnings.push(`Form factor casing ${casing?.formFactor} tidak mendukung motherboard ${motherboard?.formFactor}.`);
  const estimatedPower = (cpu?.wattage ?? 0) + (gpu?.wattage ?? 0) + 150;
  if (psu?.wattage && psu.wattage < estimatedPower) warnings.push(`PSU ${psu.wattage}W di bawah estimasi kebutuhan ${estimatedPower}W.`);

  function applyPreset(preset: Preset) {
    const next: Record<string, string> = {};
    preset.items.forEach(({ componentId }) => { const item = components.find((component) => component.id === componentId); if (item) next[item.category] = item.id; });
    setSelected(next); setPresetName(preset.name);
  }
  const waText = ["Assalamu'alaikum FS Comp.", "Saya ingin konsultasi rakit PC.", presetName ? `Preset: ${presetName}` : "Konfigurasi: Custom", ...selectedComponents.map((item) => `${pcCategoryLabels[item.category]}: ${item.name} - ${formatRupiah(item.salePrice)}`), `Estimasi total: ${formatRupiah(total)}`, "Mohon dicek kembali kompatibilitas dan stoknya."].join("\n");

  return <div className="pcBuilderLayout">
    <div className="pcBuilderMain">
      <section className="pcPresetGrid">
        {presets.map((preset) => <button type="button" className={`pcPresetCard ${presetName === preset.name ? "active" : ""}`} onClick={() => applyPreset(preset)} key={preset.id}><strong>{preset.name}</strong><span>{preset.useCase}</span><small>{preset.description}</small></button>)}
        <button type="button" className={`pcPresetCard ${presetName === "" ? "active" : ""}`} onClick={() => { setSelected({}); setPresetName(""); }}><strong>Custom</strong><span>Pilih sendiri</span><small>Susun komponen sesuai kebutuhan dan budget.</small></button>
      </section>
      <section className="panel pcComponentList">
        {categories.map((category) => <label key={category}><span><strong>{pcCategoryLabels[category]}</strong>{["CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASING"].includes(category) ? <small>Disarankan</small> : <small>Opsional</small>}</span><select value={selected[category] ?? ""} onChange={(event) => setSelected((current) => ({ ...current, [category]: event.target.value }))}><option value="">Belum dipilih</option>{byCategory(category).map((item) => <option value={item.id} key={item.id}>{item.name} - {formatRupiah(item.salePrice)}{item.inventoryItemId ? " (stok inventaris)" : ""}</option>)}</select>{chosen(category)?.specification ? <small>{chosen(category)?.specification}</small> : null}</label>)}
      </section>
    </div>
    <aside className="panel pcBuildSummary">
      <div><p className="eyebrow">Ringkasan rakitan</p><h2>{presetName || "Custom PC"}</h2></div>
      {selectedComponents.length ? selectedComponents.map((item) => <div className="pcSummaryLine" key={item.id}><span>{pcCategoryLabels[item.category]}<small>{item.name}</small></span><strong>{formatRupiah(item.salePrice)}</strong></div>) : <div className="emptyState">Pilih preset atau komponen untuk mulai.</div>}
      <div className="pcTotal"><span>Estimasi total</span><strong>{formatRupiah(total)}</strong></div>
      <div className={`pcCompatibility ${warnings.length || missingCategories.length ? "warning" : "ok"}`}>{warnings.length ? <><TriangleAlert size={19} /><span>{warnings.map((warning) => <small key={warning}>{warning}</small>)}</span></> : missingCategories.length ? <><TriangleAlert size={19}/><span><strong>Lengkapi komponen inti</strong><small>{missingCategories.map((category) => pcCategoryLabels[category]).join(", ")}</small></span></> : <><CheckCircle2 size={19} /><span><strong>Kompatibilitas dasar aman</strong><small>Admin tetap akan memverifikasi sebelum transaksi.</small></span></>}</div>
      {draftCode ? <div className="successBox">Draft tersimpan: <strong>{draftCode}</strong>. Stok belum dikurangi.</div> : null}
      <a className="greenButton" href={`https://wa.me/62816660056?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Kirim via WhatsApp</a>
      <form action={createPcBuildDraftAction} className="pcDraftForm">
        {selectedComponents.map((item) => <input type="hidden" name="componentId" value={item.id} key={item.id} />)}<input type="hidden" name="presetName" value={presetName} />
        <input name="customerName" placeholder="Nama (opsional)" /><input name="customerPhone" placeholder="Nomor WhatsApp" /><input name="need" placeholder="Kebutuhan: gaming, kantor, editing" /><input name="budget" type="number" min="0" step="100000" placeholder="Budget maksimal" /><textarea name="notes" placeholder="Catatan tambahan" />
        <button className="primaryButton" type="submit" disabled={Boolean(missingCategories.length || warnings.length)}>Simpan Draft Penawaran</button>
      </form>
    </aside>
  </div>;
}
