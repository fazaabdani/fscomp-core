import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// lib/seo.ts murni (tanpa database/Next), jadi cukup dikompilasi dengan tsc lalu dimuat sebagai CommonJS.
const tempDir = mkdtempSync(join(tmpdir(), "fscomp-seo-"));
process.on("exit", () => rmSync(tempDir, { recursive: true, force: true }));

const compile = spawnSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "lib/seo.ts",
    "--target", "ES2022",
    "--module", "CommonJS",
    "--moduleResolution", "Node10",
    "--skipLibCheck",
    "--strict",
    "--outDir", tempDir
  ],
  { cwd: process.cwd(), stdio: "inherit" }
);
if (compile.status !== 0) process.exit(compile.status ?? 1);

const seo = createRequire(import.meta.url)(join(tempDir, "seo.js"));

// Data dicontoh dari katalog live core.fscomp.id (27 Okt 2026), termasuk nama internal & salah ketik.
const dell = { id: "u1", model: "DELL LATITUDE 7410 ADA WS DILAYAR", processor: "I7 GEN 10", ram: "16GB", ssd: "256", lcdSize: "14.0", stockLocation: "Wiradesa", hargaJualRekomendasi: 4500000 };
const toshiba = { ...dell, id: "u2", model: "THOSIBA DYNABOOK PORTEGE X30-F", processor: "I7 GEN 8", ram: "8GB", ssd: "512GB", stockLocation: "Wiradesa", hargaJualRekomendasi: 4250000 };
const thinkpad = { ...dell, id: "u3", model: "LENOVO THINKPAD L14  GEN 2", processor: "I7 GEN 11", ram: "16GB", ssd: "256GB", stockLocation: "Kajen", hargaJualRekomendasi: 6300000 };
const zbook = { ...dell, id: "u4", model: "HP ZBOOK 14  DUAL VGA,  AMD FIREPRO 4100", processor: "I7 4600u", ram: "8GB", ssd: "256GB", hargaJualRekomendasi: 2900000 };
const oldDisk = { ...dell, id: "u5", model: "LENOVO THINKPAD L380", processor: "i3 GEN 8", ram: "8GB", ssd: "128G", hargaJualRekomendasi: 2850000 };
const pcSet = { ...dell, id: "u6", model: "PC SET PC + MONITOR 22 INCH", processor: "AMD Ryzen 5 PRO 4650G With radeon Graphics", ram: "16GB", ssd: "SSD NVME 128GB + 500GB", lcdSize: "-", hargaJualRekomendasi: 5700000 };
const all = [dell, toshiba, thinkpad, zbook, oldDisk, pcSet];

test("judul unit mengikuti pola 'Jual <model> <spek> — Laptop Second Pekalongan | FS Comp'", () => {
  assert.equal(seo.unitSeoTitle(dell), "Jual Dell Latitude 7410 i7 Gen 10 16GB 256GB — Laptop Second Pekalongan | FS Comp");
  assert.equal(seo.unitSeoTitle(thinkpad), "Jual Lenovo ThinkPad L14 Gen 2 i7 Gen 11 16GB 256GB — Laptop Second Pekalongan | FS Comp");
});

test("catatan internal dan huruf kapital semua tidak bocor ke judul/deskripsi", () => {
  for (const unit of all) {
    const text = `${seo.unitSeoTitle(unit)} ${seo.unitSeoDescription(unit)}`;
    assert.doesNotMatch(text, /WS\s*(DI)?\s*LAYAR/i, unit.model);
    assert.doesNotMatch(seo.unitSeoTitle(unit), /\bLATITUDE\b|\bLENOVO\b|\bTHINKPAD\b/, unit.model);
  }
});

test("salah ketik merek yang ada di inventori dibenarkan", () => {
  assert.match(seo.unitSeoTitle(toshiba), /^Jual Toshiba Dynabook Portege X30-F /);
  assert.doesNotMatch(seo.unitSeoTitle(toshiba), /thosiba/i);
});

test("judul tidak lebih dari 90 karakter dan selalu memuat lokasi", () => {
  for (const unit of all) {
    const title = seo.unitSeoTitle(unit);
    assert.ok(title.length <= 90, `${title.length}: ${title}`);
    assert.match(title, /Pekalongan \| FS Comp$/);
  }
});

test("deskripsi memuat kata kunci lokal, lokasi stok, harga, dan garansi", () => {
  const description = seo.unitSeoDescription(thinkpad);
  assert.match(description, /laptop second Pekalongan/);
  assert.match(description, /Stok Kajen/);
  assert.match(description, /Rp 6\.300\.000/);
  assert.match(description, /garansi software 3 bulan, hardware 3 minggu/);
  assert.match(seo.unitSeoDescription(dell), /Stok Wiradesa/);
  assert.ok(seo.unitSeoDescription(dell).length <= 175, "deskripsi unit biasa tetap ringkas");
});

test("ukuran penyimpanan dari input operator disamakan", () => {
  assert.match(seo.unitSeoTitle(oldDisk), / 8GB 128GB — /);
  assert.match(seo.unitSeoDescription(oldDisk), /SSD 128GB/);
  assert.match(seo.unitSeoDescription(dell), /SSD 256GB/);
});

test("PC set diberi label 'PC Second', bukan laptop", () => {
  assert.match(seo.unitSeoTitle(pcSet), /— PC Second Pekalongan \| FS Comp$/);
  assert.match(seo.unitSeoDescription(pcSet), /^Jual PC second Pekalongan:/);
});

test("Product JSON-LD: harga IDR, kondisi bekas, ketersediaan, merek, spek", () => {
  const ld = seo.productJsonLd(dell, { photos: ["https://core.fscomp.id/api/media/a.webp"], highlight: "Layar bersih.", availability: "InStock" });
  assert.equal(ld["@context"], "https://schema.org");
  assert.equal(ld["@type"], "Product");
  assert.equal(ld.name, "Dell Latitude 7410");
  assert.equal(ld.url, "https://core.fscomp.id/unit/u1");
  assert.equal(ld.sku, "u1");
  assert.deepEqual(ld.brand, { "@type": "Brand", name: "Dell" });
  assert.deepEqual(ld.image, ["https://core.fscomp.id/api/media/a.webp"]);
  assert.equal(ld.offers["@type"], "Offer");
  assert.equal(ld.offers.priceCurrency, "IDR");
  assert.equal(ld.offers.price, 4500000);
  assert.equal(ld.offers.itemCondition, "https://schema.org/UsedCondition");
  assert.equal(ld.offers.availability, "https://schema.org/InStock");
  assert.equal(ld.offers.url, ld.url);
  const props = Object.fromEntries(ld.additionalProperty.map((item) => [item.name, item.value]));
  assert.deepEqual(props, { Prosesor: "i7 Gen 10", RAM: "16GB", Penyimpanan: "SSD 256GB", "Ukuran layar": "14.0" });
  assert.match(ld.description, /laptop second/i);
  assert.match(ld.description, /Layar bersih\./);
});

test("Product JSON-LD hanya memakai data sistem: tanpa rating, ulasan, atau masa berlaku harga karangan", () => {
  const ld = seo.productJsonLd(dell, { photos: [], highlight: "", availability: "SoldOut" });
  const json = JSON.stringify(ld);
  assert.doesNotMatch(json, /aggregateRating|"review"|ratingValue|priceValidUntil/);
  assert.equal(ld.offers.availability, "https://schema.org/SoldOut");
  assert.equal(ld.image, undefined, "tanpa foto, properti image tidak dibuat");
  assert.ok(!JSON.stringify(ld).includes("undefined"));
});

test("Product JSON-LD: ukuran layar kosong ('-') dibuang, PC tidak diberi merek", () => {
  const ld = seo.productJsonLd(pcSet, { photos: [], highlight: "", availability: "InStock" });
  assert.equal(ld.brand, undefined);
  assert.equal(ld.category, "PC Second");
  assert.ok(!ld.additionalProperty.some((item) => item.name === "Ukuran layar"));
});

test("CollectionPage/ItemList untuk /katalog memuat URL unit absolut dan nama bersih", () => {
  const ld = seo.catalogJsonLd([dell, toshiba]);
  assert.equal(ld["@type"], "CollectionPage");
  assert.equal(ld.url, "https://core.fscomp.id/katalog");
  assert.equal(ld.mainEntity["@type"], "ItemList");
  assert.equal(ld.mainEntity.numberOfItems, 2);
  assert.deepEqual(ld.mainEntity.itemListElement[1], { "@type": "ListItem", position: 2, url: "https://core.fscomp.id/unit/u2", name: "Toshiba Dynabook Portege X30-F" });
  assert.ok(ld.mainEntity.itemListElement.every((item) => !item.url.includes("?")));
});

test("katalog kosong tetap menghasilkan JSON-LD valid tanpa ItemList", () => {
  const ld = JSON.parse(JSON.stringify(seo.catalogJsonLd([])));
  assert.equal(ld["@type"], "CollectionPage");
  assert.equal("mainEntity" in ld, false);
});

test("judul & deskripsi halaman katalog dan rakit PC memuat kata kunci lokal", () => {
  assert.match(seo.CATALOG_SEO_TITLE, /Laptop Second Pekalongan/);
  assert.match(seo.CATALOG_SEO_DESCRIPTION, /Wiradesa & Kajen/);
  assert.match(seo.CATALOG_SEO_DESCRIPTION, /garansi software 3 bulan, hardware 3 minggu/);
  assert.match(seo.PC_BUILDER_SEO_TITLE, /Rakit PC/);
});

test("absoluteUrl tidak menggandakan domain", () => {
  assert.equal(seo.absoluteUrl("/api/media/a.webp"), "https://core.fscomp.id/api/media/a.webp");
  assert.equal(seo.absoluteUrl("https://x.test/a.webp"), "https://x.test/a.webp");
});
