// Logika "Fesi", maskot asisten di katalog publik. MURNI (tanpa database/Next/React) supaya mudah diuji.
// Prinsip: jawaban hanya dari fakta toko yang sudah tampil di katalog; apa pun yang belum pasti diarahkan ke admin via WhatsApp.
// Rekomendasi unit memakai stok nyata dari /api/katalog/fesi (unit yang sudah lolos QC), tidak pernah mengarang harga/stok.

export type FesiUnit = {
  id: string;
  nomorUnit: string;
  model: string;
  processor: string;
  ram: string;
  ssd: string;
  price: number;
  lokasi: string;
  image: string | null;
};

export type NeedId = "kuliah" | "kerja" | "desain";
export type BudgetId = "lt3" | "3-5" | "5-7" | "gt7" | "any";

export const NEEDS: { id: NeedId; label: string; short: string }[] = [
  { id: "kuliah", label: "Kuliah / Sekolah", short: "kuliah/sekolah" },
  { id: "kerja", label: "Kerja / Kantoran", short: "kerja kantoran" },
  { id: "desain", label: "Desain / Coding", short: "desain/coding" }
];

export const BUDGETS: { id: BudgetId; label: string; min: number; max: number }[] = [
  { id: "lt3", label: "Di bawah 3 jt", min: 0, max: 3_000_000 },
  { id: "3-5", label: "3 – 5 jt", min: 3_000_000, max: 5_000_000 },
  { id: "5-7", label: "5 – 7 jt", min: 5_000_000, max: 7_000_000 },
  { id: "gt7", label: "Di atas 7 jt", min: 7_000_000, max: Number.POSITIVE_INFINITY },
  { id: "any", label: "Belum tahu", min: 0, max: Number.POSITIVE_INFINITY }
];

export const WA_NUMBER = "62816660056"; // sama dengan tombol WA katalog (FS Comp Wiradesa)

// ---------- membaca spesifikasi dari teks ----------
export function cpuInfo(processor: string) {
  const p = processor.toLowerCase();
  let tier = 0;
  const intel = p.match(/\bi([3579])\b|core\s*i([3579])|i([3579])[-\s]?\d/);
  const ryzen = p.match(/ryzen\s*([3579])/);
  if (intel) tier = (Number(intel[1] ?? intel[2] ?? intel[3]) + 1) / 2 - 1; // i3=1, i5=2, i7=3, i9=4
  else if (ryzen) tier = (Number(ryzen[1]) + 1) / 2 - 1;
  let gen = 0;
  const g = p.match(/gen(?:erasi)?\s*(\d{1,2})/);
  if (g) gen = Number(g[1]);
  else {
    const n = p.match(/i[3579][-\s]?(\d{4,5})/); // contoh: i5-8250U -> 8, i7-10510U -> 10
    if (n) gen = n[1].length === 5 ? Number(n[1].slice(0, 2)) : Number(n[1].slice(0, 1));
  }
  return { tier, gen };
}

export function gbOf(value: string) {
  const m = value.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(tb|gb)?/);
  if (!m) return 0;
  const n = Number(m[1].replace(",", "."));
  return m[2] === "tb" ? n * 1000 : n;
}

export function specScore(unit: Pick<FesiUnit, "processor" | "ram" | "ssd">) {
  const { tier, gen } = cpuInfo(unit.processor);
  return tier * 10 + gen * 2 + Math.min(gbOf(unit.ram), 32) / 2 + Math.min(gbOf(unit.ssd), 1024) / 128;
}

// Syarat minimum nyaman per kebutuhan.
export function meetsNeed(unit: FesiUnit, need: NeedId) {
  const { tier, gen } = cpuInfo(unit.processor);
  const ram = gbOf(unit.ram);
  const ssd = gbOf(unit.ssd);
  if (need === "kuliah") return ram >= 8 && tier >= 1 && gen >= 6;
  if (need === "kerja") return ram >= 8 && tier >= 2 && gen >= 7 && ssd >= 256;
  return (ram >= 16 || (tier >= 3 && ram >= 8)) && tier >= 2 && gen >= 8 && ssd >= 256; // desain/coding
}

export type Recommendation = { units: FesiUnit[]; mode: "pas" | "budget-longgar" | "spek-longgar" | "kosong" };

export function recommend(all: FesiUnit[], need: NeedId, budget: BudgetId, limit = 3): Recommendation {
  const b = BUDGETS.find((x) => x.id === budget) ?? BUDGETS[4];
  const inBudget = (u: FesiUnit, slack = 0) => u.price >= b.min * (1 - slack) && u.price <= b.max * (1 + slack);
  // Kuliah: nilai terbaik per rupiah. Kerja/desain: spek terbaik di dalam budget.
  const rank = (list: FesiUnit[]) =>
    [...list].sort((x, y) =>
      need === "kuliah" ? specScore(y) / y.price - specScore(x) / x.price : specScore(y) - specScore(x) || x.price - y.price
    );

  const exact = rank(all.filter((u) => inBudget(u) && meetsNeed(u, need)));
  if (exact.length > 0) return { units: exact.slice(0, limit), mode: "pas" };

  const nearBudget = rank(all.filter((u) => inBudget(u, 0.15) && meetsNeed(u, need)));
  if (nearBudget.length > 0) return { units: nearBudget.slice(0, limit), mode: "budget-longgar" };

  const anySpec = rank(all.filter((u) => inBudget(u)));
  if (anySpec.length > 0) return { units: anySpec.slice(0, limit), mode: "spek-longgar" };

  return { units: [], mode: "kosong" };
}

// ---------- format ----------
export const rupiah = (n: number) => `Rp${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

export function waLink(lines: string[]) {
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function waForUnit(u: FesiUnit) {
  return waLink([
    "Assalamu'alaikum FS Comp.",
    `Saya tertarik dengan Unit ${u.nomorUnit} - ${u.model}.`,
    `Harga di katalog: ${rupiah(u.price)}.`,
    "Apakah unitnya masih ready? (dari asisten Fesi)"
  ]);
}

export function waGeneral(need?: NeedId, budget?: BudgetId, extra?: string) {
  const n = NEEDS.find((x) => x.id === need)?.short;
  const b = BUDGETS.find((x) => x.id === budget);
  return waLink(
    [
      "Assalamu'alaikum FS Comp, saya dari asisten Fesi di katalog.",
      n ? `Kebutuhan: ${n}.` : "",
      b && b.id !== "any" ? `Budget: ${b.label}.` : "",
      extra ?? "Mohon dibantu ya."
    ].filter(Boolean)
  );
}

// ---------- FAQ (hanya fakta yang sudah tampil di katalog/nota; sisanya diarahkan ke admin) ----------
export type Faq = { id: string; label: string; keywords: string[]; answer: string; link?: { href: string; text: string }; waText?: string };

export const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=FS+Comp";

export const FAQS: Faq[] = [
  {
    id: "garansi",
    label: "Garansi",
    keywords: ["garansi", "klaim", "jaminan", "warranty"],
    answer: "Semua laptop bergaransi toko, tertulis di nota: hardware 3 minggu, software 3 bulan. Kalau ada kendala, kakak bisa langsung hubungi kami."
  },
  {
    id: "qc",
    label: "QC & kondisi",
    keywords: ["qc", "dicek", "cek", "kualitas", "kondisi", "baterai", "bekas", "second", "mulus", "layar"],
    answer:
      "Setiap unit dicek dulu sebelum tayang: kesehatan baterai dan SSD, kondisi layar, versi Windows, dan Office. Hanya unit yang lolos QC yang muncul di katalog, dan hasil cek tiap unit bisa dibaca di halaman detailnya."
  },
  {
    id: "bayar",
    label: "Cara bayar",
    keywords: ["bayar", "pembayaran", "transfer", "cash", "tunai", "tempo", "kartu"],
    answer: "Pembayaran bisa cash atau transfer bank. Kalau mau dicicil, bisa kredit lewat SPayLater di cabang Kajen."
  },
  {
    id: "kredit",
    label: "Cicilan / kredit",
    keywords: ["cicil", "cicilan", "kredit", "spaylater", "paylater", "angsuran", "nyicil"],
    answer: "Bisa kredit lewat SPayLater di cabang Kajen (FS.ID Kajen, Jl. Diponegoro No. 204B). Untuk syarat dan simulasi cicilannya, tanya admin ya."
  },
  {
    id: "kirim",
    label: "Pengiriman",
    keywords: ["kirim", "ongkir", "ekspedisi", "cod", "luar kota", "antar", "paket"],
    answer: "Bisa ambil di toko (Wiradesa atau Kajen), atau dikirim: COD atau ekspedisi untuk luar kota. Ongkir tergantung tujuan, silakan tanya admin."
  },
  {
    id: "lokasi",
    label: "Lokasi toko",
    keywords: ["lokasi", "alamat", "toko", "dimana", "di mana", "maps", "buka", "jam", "datang", "wiradesa", "kajen", "janji", "janjian", "tutup", "libur"],
    answer:
      "Pusat laptop second ada di FS Comp Wiradesa: Jl. Wiradesa No.1 RT 22 RW 05, Wiradesa, Kab. Pekalongan (0816-6600-56). Ada juga cabang FS.ID Kajen: Jl. Diponegoro No. 204B, utara Rumah Dinas Wakil Bupati, Kajen (0851-8266-1773). Jam buka 09.00 sampai 17.00; di luar jam itu bisa janjian dulu lewat admin. Di Google Maps, cukup ketik \"FS Comp\".",
    link: { href: MAPS_URL, text: "Buka di Google Maps" }
  },
  {
    id: "booking",
    label: "Booking / stok",
    keywords: ["booking", "dp", "tahan", "pesan", "ready", "stok", "masih ada", "pengikat", "amankan"],
    answer: "Stok di katalog selalu diperbarui dari sistem toko, jadi unit yang tampil memang tersedia. Mau diamankan dulu? Bisa booking dengan DP pengikat Rp500.000, chat admin lewat WhatsApp ya."
  },
  {
    id: "servis",
    label: "Servis laptop",
    keywords: ["servis", "service", "upgrade", "ganti", "perbaikan", "repair"],
    answer: "Kami juga melayani servis laptop dengan teknisi berpengalaman. Detail dan biayanya tanya admin, nanti dicek dulu kondisinya."
  },
  {
    id: "rakit",
    label: "Rakit PC",
    keywords: ["rakit", "pc", "komputer", "gaming", "komponen"],
    answer: "Rakit PC lewat website masih dalam pengembangan. Untuk rakit PC, langsung chat admin saja ya, nanti dibantu pilih komponen sesuai kebutuhan dan budget.",
    waText: "Saya mau tanya soal rakit PC."
  },
  {
    id: "tukar",
    label: "Tukar tambah",
    keywords: ["tukar", "tambah", "jual laptop", "trade", "laptop lama"],
    answer:
      "Bisa tukar tambah! Syarat unit lama: kondisinya normal tanpa minus dan tahun pembuatan maksimal 2017. Supaya pasti, bawa unitnya ke toko dulu untuk dicek detail, nanti dinilai langsung."
  }
];

const normalize = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;

/** Cocokkan pertanyaan bebas ke FAQ beserta skornya. Null kalau tidak yakin (jangan menebak). */
export function matchFaqScored(text: string): { faq: Faq; score: number } | null {
  const q = normalize(text);
  let best: { faq: Faq; score: number } | null = null;
  for (const faq of FAQS) {
    let score = 0;
    for (const k of faq.keywords) if (q.includes(` ${k} `) || (k.length >= 5 && q.includes(k))) score += k.length >= 5 ? 2 : 1;
    if (score > 0 && (!best || score > best.score)) best = { faq, score };
  }
  return best;
}

export function matchFaq(text: string): Faq | null {
  return matchFaqScored(text)?.faq ?? null;
}

export function isGreeting(text: string) {
  return /^(\s*)(hai|halo|hallo|hi|hey|assalamu|assalamualaikum|salam|permisi|pagi|siang|sore|malam)\b/.test(text.toLowerCase().trim());
}

/** Tangkap budget dari kalimat seperti "budget 4 juta" atau "5jt". Hasilnya id budget terdekat. */
export function budgetFromText(text: string): BudgetId | null {
  const m = text.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/);
  if (!m) return null;
  const n = Number(m[1].replace(",", ".")) * 1_000_000;
  if (n <= 3_000_000) return "lt3";
  if (n <= 5_000_000) return "3-5";
  if (n <= 7_000_000) return "5-7";
  return "gt7";
}

export function needFromText(text: string): NeedId | null {
  const q = text.toLowerCase();
  if (/(kuliah|sekolah|skripsi|tugas|mahasiswa|pelajar|anak)/.test(q)) return "kuliah";
  if (/(kerja|kantor|office|admin|excel|bisnis|kasir)/.test(q)) return "kerja";
  if (/(desain|design|coding|ngoding|program|edit|video|photoshop|corel|gaming|game)/.test(q)) return "desain";
  return null;
}
