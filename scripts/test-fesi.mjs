import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// lib/fesi.ts murni (tanpa database/Next), jadi cukup dikompilasi dengan tsc lalu dimuat sebagai CommonJS.
const tempDir = mkdtempSync(join(tmpdir(), "fscomp-fesi-"));
process.on("exit", () => rmSync(tempDir, { recursive: true, force: true }));
const compile = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "lib/fesi.ts", "--target", "ES2022", "--module", "CommonJS", "--moduleResolution", "Node10", "--skipLibCheck", "--strict", "--outDir", tempDir],
  { cwd: process.cwd(), stdio: "inherit" }
);
assert.equal(compile.status, 0, "lib/fesi.ts harus lolos tsc strict");
const fesi = createRequire(import.meta.url)(join(tempDir, "fesi.js"));

const u = (id, model, processor, ram, ssd, price) => ({ id, nomorUnit: id, model, processor, ram, ssd, price, lokasi: "Wiradesa", image: null });
const STOK = [
  u("a", "HP ProBook 645 G1", "AMD A8-5550M", "8GB", "256GB", 3050000),
  u("b", "Latitude 7470", "I5 GEN 6", "8GB", "256GB", 3350000),
  u("c", "ThinkPad X13", "I5 GEN 10", "8GB", "256GB", 4300000),
  u("d", "EliteBook 840 G3", "I7 GEN 6", "16GB", "256GB", 4200000),
  u("e", "ThinkPad L14", "I7 GEN 10", "16GB", "256GB", 5700000),
  u("f", "Latitude 5330", "I7 GEN 12", "16GB", "256GB", 7500000),
  u("g", "ThinkPad T14 Gen 2", "I7 GEN 11", "16GB", "256GB", 7100000)
];

test("cpuInfo membaca tier dan generasi", () => {
  assert.deepEqual(fesi.cpuInfo("I5 GEN 10"), { tier: 2, gen: 10 });
  assert.deepEqual(fesi.cpuInfo("Intel Core i7-8550U"), { tier: 3, gen: 8 });
  assert.deepEqual(fesi.cpuInfo("Core i5-10210U"), { tier: 2, gen: 10 });
  assert.equal(fesi.cpuInfo("AMD A8-5550M").tier, 0);
  assert.equal(fesi.cpuInfo("Ryzen 5 PRO 4650G").tier, 2);
});

test("gbOf membaca GB dan TB", () => {
  assert.equal(fesi.gbOf("16GB"), 16);
  assert.equal(fesi.gbOf("256 GB"), 256);
  assert.equal(fesi.gbOf("1TB"), 1000);
});

test("rekomendasi menghormati budget dan kebutuhan", () => {
  const kuliah = fesi.recommend(STOK, "kuliah", "3-5");
  assert.equal(kuliah.mode, "pas");
  assert.ok(kuliah.units.length > 0 && kuliah.units.length <= 3);
  for (const x of kuliah.units) assert.ok(x.price >= 3_000_000 && x.price <= 5_000_000);
  assert.ok(!kuliah.units.some((x) => x.id === "a"), "CPU AMD A-series (tier 0) tidak direkomendasikan");

  const desain = fesi.recommend(STOK, "desain", "any");
  assert.equal(desain.mode, "pas");
  for (const x of desain.units) assert.ok(fesi.gbOf(x.ram) >= 16 || fesi.cpuInfo(x.processor).tier >= 3);
  assert.equal(desain.units[0].id, "f", "spek terbaik di urutan pertama");
});

test("budget tanpa unit pas: longgar atau kosong, tidak mengarang", () => {
  assert.equal(fesi.recommend(STOK, "desain", "lt3").mode, "kosong");
  const none = fesi.recommend([], "kuliah", "any");
  assert.equal(none.mode, "kosong");
  assert.deepEqual(none.units, []);
  const near = fesi.recommend([u("z", "X", "I5 GEN 8", "8GB", "256GB", 5_400_000)], "kerja", "3-5");
  assert.equal(near.mode, "budget-longgar");
});

test("matchFaq mengenali pertanyaan umum dan tidak menebak", () => {
  assert.equal(fesi.matchFaq("garansinya berapa lama?").id, "garansi");
  assert.equal(fesi.matchFaq("bisa cod ke luar kota?").id, "kirim");
  assert.equal(fesi.matchFaq("alamat tokonya dimana").id, "lokasi");
  assert.equal(fesi.matchFaq("bisa rakit pc gaming?").id, "rakit");
  assert.equal(fesi.matchFaq("blablabla xyz"), null);
});

test("deteksi kebutuhan dan budget dari kalimat", () => {
  assert.equal(fesi.needFromText("buat anak kuliah"), "kuliah");
  assert.equal(fesi.needFromText("untuk kerja kantor"), "kerja");
  assert.equal(fesi.needFromText("edit video"), "desain");
  assert.equal(fesi.budgetFromText("budget 4 juta"), "3-5");
  assert.equal(fesi.budgetFromText("maksimal 2,5jt"), "lt3");
  assert.equal(fesi.budgetFromText("8 juta"), "gt7");
  assert.equal(fesi.budgetFromText("laptop murah"), null);
});

test("tautan WhatsApp terisi pesan dan aman", () => {
  const link = fesi.waForUnit(STOK[0]);
  assert.ok(link.startsWith("https://wa.me/62816660056?text="));
  assert.ok(decodeURIComponent(link).includes("Harga di katalog: Rp3.050.000"));
  assert.equal(fesi.rupiah(4500000), "Rp4.500.000");
});

test("FAQ hanya berisi fakta yang sudah ada di katalog (garansi 3 minggu/3 bulan)", () => {
  const garansi = fesi.FAQS.find((f) => f.id === "garansi");
  assert.match(garansi.answer, /3 minggu/);
  assert.match(garansi.answer, /3 bulan/);
});
