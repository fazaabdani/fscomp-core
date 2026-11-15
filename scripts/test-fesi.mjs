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
  ["node_modules/typescript/bin/tsc", "lib/fesi.ts", "lib/fesi-lead.ts", "--target", "ES2022", "--module", "CommonJS", "--moduleResolution", "Node10", "--skipLibCheck", "--strict", "--outDir", tempDir],
  { cwd: process.cwd(), stdio: "inherit" }
);
assert.equal(compile.status, 0, "lib/fesi.ts dan lib/fesi-lead.ts harus lolos tsc strict");
const fesi = createRequire(import.meta.url)(join(tempDir, "fesi.js"));
const lead = createRequire(import.meta.url)(join(tempDir, "fesi-lead.js"));

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

const UID = "cm1abcdefghijklmnopqrstuv"; // bentuk cuid: huruf c + 24 karakter
const UID2 = "cm2abcdefghijklmnopqrstuv";

test("sanitizeLead hanya meloloskan nilai yang dikenal", () => {
  const ok = lead.sanitizeLead({ sid: "tes-12345678", kind: "unit", unitId: UID, need: "kuliah", budget: "3-5", shown: [UID, UID2, "bukan-id"], faq: ["garansi", "hack"], device: "mobile" });
  assert.equal(ok.kind, "unit");
  assert.equal(ok.need, "kuliah");
  assert.equal(ok.budget, "3-5");
  assert.deepEqual(ok.shownUnitIds, [UID, UID2]);
  assert.deepEqual(ok.faqTopics, ["garansi"]);
  assert.equal(ok.test, true);
  assert.equal(lead.sanitizeLead({ sid: "x" }), null, "sid tidak valid ditolak");
  assert.equal(lead.sanitizeLead({ sid: "abcdefgh12", kind: "unit" }), null, "kind unit tanpa unitId ditolak");
  const odd = lead.sanitizeLead({ sid: "abcdefgh12", kind: "admin", need: "<script>", budget: "x" });
  assert.equal(odd.need, null);
  assert.equal(odd.budget, null);
});

test("pesan lead lengkap, aman dari HTML, dan tanpa data pribadi", () => {
  const l = lead.sanitizeLead({ sid: "abcdefgh12", kind: "unit", unitId: UID, need: "kuliah", budget: "3-5", shown: [UID, UID2], faq: ["garansi"], device: "mobile" });
  const units = [
    { id: UID, nomorUnit: "A1", model: "X13 <b>&</b>", price: 4300000, lokasi: "Wiradesa" },
    { id: UID2, nomorUnit: "B2", model: "EliteBook", price: 4200000, lokasi: "Kajen" }
  ];
  const text = lead.buildLeadMessage(l, units, new Date("2026-11-16T03:42:00Z"));
  assert.match(text, /Calon pembeli dari Fesi/);
  assert.match(text, /Kebutuhan: Kuliah \/ Sekolah/);
  assert.match(text, /Budget: 3 – 5 jt/);
  assert.match(text, /Rp4\.300\.000/);
  assert.match(text, /href="https:\/\/core\.fscomp\.id\/unit\/cm1abcdefghijklmnopqrstuv"/);
  assert.match(text, /X13 &lt;b&gt;&amp;&lt;\/b&gt;/, "HTML di nama unit di-escape");
  assert.match(text, /Sempat tanya: Garansi/);
  assert.match(text, /HP · 10\.42 WIB/);
  assert.ok(!/\+?62\d{8,}|@/.test(text), "tidak ada nomor HP/email");
  assert.ok(!/TES/.test(text));
  const tes = lead.buildLeadMessage(lead.sanitizeLead({ sid: "tes-abcdef12", kind: "admin" }), []);
  assert.match(tes, /\[TES\]/);
});

test("pengurang duplikat: satu peringatan per kunci dalam jendela waktu", () => {
  const once = lead.createLeadDeduper(1000);
  assert.equal(once("s1:u1", 0), true);
  assert.equal(once("s1:u1", 500), false);
  assert.equal(once("s1:u2", 500), true);
  assert.equal(once("s1:u1", 1500), true);
});

test("FAQ memuat kebijakan toko yang sudah dikonfirmasi pemilik", () => {
  assert.equal(fesi.matchFaq("bisa tukar tambah laptop lama?").id, "tukar");
  assert.match(fesi.FAQS.find((f) => f.id === "tukar").answer, /2017/);
  assert.match(fesi.FAQS.find((f) => f.id === "tukar").answer, /minus/);
  assert.equal(fesi.matchFaq("bisa kredit spaylater?").id, "kredit");
  assert.match(fesi.FAQS.find((f) => f.id === "kredit").answer, /Kajen/);
  assert.match(fesi.FAQS.find((f) => f.id === "booking").answer, /Rp500\.000/);
  assert.match(fesi.FAQS.find((f) => f.id === "lokasi").answer, /09\.00 sampai 17\.00/);
  assert.equal(fesi.matchFaq("buka jam berapa?").id, "lokasi");
});

test("jam buka 09.00-17.00 WIB menentukan alert senyap", () => {
  assert.equal(lead.isOpenHours(new Date("2026-11-16T02:00:00Z")), true); // 09.00 WIB
  assert.equal(lead.isOpenHours(new Date("2026-11-16T09:59:00Z")), true); // 16.59 WIB
  assert.equal(lead.isOpenHours(new Date("2026-11-16T10:00:00Z")), false); // 17.00 WIB
  assert.equal(lead.isOpenHours(new Date("2026-11-16T01:59:00Z")), false); // 08.59 WIB
  const night = lead.buildLeadMessage(lead.sanitizeLead({ sid: "abcdefgh12", kind: "admin" }), [], new Date("2026-11-16T14:00:00Z"));
  assert.match(night, /Di luar jam buka/);
});

test("rakit PC diarahkan ke admin dan lokasi punya tautan Google Maps", () => {
  const rakit = fesi.FAQS.find((f) => f.id === "rakit");
  assert.match(rakit.answer, /pengembangan/);
  assert.match(rakit.answer, /chat admin/i);
  assert.equal(rakit.link, undefined, "tidak lagi menautkan halaman rakit PC");
  assert.ok(rakit.waText);
  const lokasi = fesi.FAQS.find((f) => f.id === "lokasi");
  assert.match(lokasi.answer, /Pusat laptop second ada di FS Comp Wiradesa/);
  assert.match(lokasi.answer, /FS Comp/);
  assert.equal(lokasi.link.href, "https://www.google.com/maps/search/?api=1&query=FS+Comp");
});

test("pertanyaan yang belum terjawab ikut tertulis otomatis di pesan WhatsApp", () => {
  const notes = ["Syarat dan simulasi cicilan SPayLater (Kajen)", '"apakah ada garansi mesin?"'];
  const general = decodeURIComponent(fesi.waGeneral("kuliah", "3-5", undefined, notes));
  assert.match(general, /Yang ingin saya tanyakan juga:/);
  assert.match(general, /- Syarat dan simulasi cicilan SPayLater \(Kajen\)/);
  assert.match(general, /- "apakah ada garansi mesin\?"/);
  assert.ok(general.indexOf("Budget") < general.indexOf("Yang ingin saya tanyakan"), "urutan: kebutuhan, budget, lalu pertanyaan");
  const unit = decodeURIComponent(fesi.waForUnit(STOK[0], notes));
  assert.match(unit, /Yang ingin saya tanyakan juga:/);
  assert.match(unit, /Apakah unitnya masih ready\?/);
  assert.ok(!/Yang ingin saya tanyakan/.test(decodeURIComponent(fesi.waGeneral("kuliah", "3-5"))), "tanpa catatan, blok tidak muncul");
  assert.equal(fesi.FAQS.find((f) => f.id === "kredit").followUp.includes("SPayLater"), true);
});

test("alert lead memberi tahu admin ada pertanyaan belum terjawab", () => {
  const l = lead.sanitizeLead({ sid: "abcdefgh12", kind: "admin", pending: 2 });
  assert.equal(l.pending, 2);
  assert.match(lead.buildLeadMessage(l, []), /Ada 2 pertanyaan yang belum terjawab Fesi/);
  assert.equal(lead.sanitizeLead({ sid: "abcdefgh12", kind: "admin", pending: 99 }).pending, 6);
  assert.equal(lead.sanitizeLead({ sid: "abcdefgh12", kind: "admin", pending: "x" }).pending, 0);
  assert.ok(!/belum terjawab/.test(lead.buildLeadMessage(lead.sanitizeLead({ sid: "abcdefgh12", kind: "admin" }), [])));
});
