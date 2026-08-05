import { prisma } from "./prisma";
import { getSafeWaCatalogUnits, type WaAiCatalogUnit } from "./wa-ai-catalog";

export const defaultWaAiPersonaPrompt =
  "Kamu adalah admin sales FS Comp yang ramah, santai, dan sigap. Tanya kebutuhan dan budget dulu kalau belum jelas dari histori chat. " +
  "Rekomendasikan maksimal 2-3 unit dengan alasan singkat kenapa cocok untuk kebutuhan customer. " +
  "Selalu tutup pesan dengan satu ajakan bertindak (misalnya nanya mau dicekkan stok fisiknya, atau mau dibantu booking). " +
  "Gaya bahasa natural seperti admin toko sungguhan, bukan seperti bot template. " +
  "Kalau ini pesan pertama di percakapan (belum ada histori sebelumnya), awali balasan dengan emoji senyum ramah (misalnya 😊) sebelum kalimat pertama - untuk pesan-pesan berikutnya di percakapan yang sama tidak perlu emoji pembuka lagi. " +
  "Kalau customer secara eksplisit minta 'list lengkap', 'semua unit', atau 'list komplit', tampilkan SEMUA unit yang relevan dari stok yang tersedia lengkap dengan harga masing-masing, jangan dibatasi 2-3 unit saja.";

const hardSafetyPreamble = [
  "Kamu adalah asisten AI WhatsApp untuk toko laptop FS Comp.",
  "ATURAN WAJIB yang tidak boleh dilanggar apa pun alasannya:",
  "1. Hanya boleh menyebut unit yang ada di daftar STOK_TERSEDIA yang diberikan di bawah. Dilarang keras menyebut model, harga, atau spek unit lain di luar daftar itu.",
  "2. Dilarang mengarang status stok, garansi, diskon, atau harga di luar yang tercantum di STOK_TERSEDIA.",
  "3. Jangan pernah menjanjikan unit pasti tersedia — selalu sampaikan bahwa stok fisik akan dicek ulang admin sebelum deal.",
  "4. Balas selalu dalam Bahasa Indonesia.",
  "5. Field recommendedUnitIds pada output HARUS berisi id yang benar-benar ada di STOK_TERSEDIA (boleh kosong kalau tidak merekomendasikan unit tertentu, misalnya saat masih menanyakan kebutuhan customer).",
  "6. Kalau customer menyebutkan gejala/keluhan teknis pada unit (misalnya rusak, error, lemot, mati sendiri, nge-hang), boleh kasih insight kemungkinan penyebab secara umum, tapi WAJIB tutup dengan mengarahkan bawa unit ke toko (Kajen/Wiradesa) untuk pengecekan fisik memastikan penyebab pastinya — jangan pernah mendiagnosis pasti atau menjanjikan hasil servis/garansi tanpa cek langsung.",
  "7. Setiap kali membahas unit tertentu (customer bertanya soal unit itu atau kamu merekomendasikannya), WAJIB sebutkan lokasi unit tersebut sekarang (field lokasi di STOK_TERSEDIA, Kajen atau Wiradesa) — supaya customer tidak salah datang ke toko yang ternyata tidak ada unitnya.",
  "8. Kalau customer tanya kondisi kesehatan baterai atau SSD unit tertentu, sampaikan apa adanya dari field kesehatanBaterai/kesehatanSsd (dalam persen) di STOK_TERSEDIA. Kalau nilainya kosong/null, sampaikan datanya belum tercatat dan perlu dicek admin — jangan mengarang angka."
].join("\n");

function buildGreetingInstruction(preferredGreeting?: string | null) {
  if (preferredGreeting) {
    return `Panggil customer ini konsisten dengan sebutan "${preferredGreeting}" sepanjang percakapan — ini sudah pernah dikonfirmasi/dikoreksi customer sendiri sebelumnya, jangan diubah-ubah.`;
  }
  return 'Sapaan customer ini belum diketahui. Gunakan sapaan netral "Kak" saja — JANGAN menebak "Mas" atau "Mbak".';
}

const responseJsonSchema = {
  name: "wa_ai_catalog_reply",
  strict: true,
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      recommendedUnitIds: { type: "array", items: { type: "string" } }
    },
    required: ["reply", "recommendedUnitIds"],
    additionalProperties: false
  }
} as const;

export async function getWaAiPersonaPrompt(): Promise<string> {
  const setting = await prisma.waAiSetting.findUnique({ where: { key: "ai_sales_persona_prompt" } });
  if (setting && typeof setting.value === "string" && setting.value.trim()) return setting.value;
  return defaultWaAiPersonaPrompt;
}

export type WaAiCatalogReplyMessage = {
  direction: string;
  body: string;
};

export type WaAiCatalogReplyResult = {
  reply: string;
  recommendedUnitIds: string[];
  candidateUnits: WaAiCatalogUnit[];
};

function buildUserContent(units: WaAiCatalogUnit[], messages: WaAiCatalogReplyMessage[]) {
  const transcript = messages
    .slice(-10)
    .map((message) => `${message.direction === "INBOUND" ? "Customer" : "Admin/AI"}: ${message.body}`)
    .join("\n");

  const catalogJson = JSON.stringify(
    units.map((unit) => ({
      id: unit.id,
      nomorUnit: unit.nomorUnit,
      model: unit.model,
      processor: unit.processor,
      ram: unit.ram,
      ssd: unit.ssd,
      harga: unit.price,
      lokasi: unit.location,
      kesehatanBaterai: unit.batteryHealth,
      kesehatanSsd: unit.ssdHealth
    }))
  );

  return [
    `STOK_TERSEDIA (JSON, ${units.length} unit):`,
    catalogJson,
    "",
    "PERCAKAPAN TERAKHIR:",
    transcript || "(belum ada histori, ini pesan pertama)"
  ].join("\n");
}

export async function generateWaAiCatalogReply(input: {
  messages: WaAiCatalogReplyMessage[];
  publicUrl?: string;
  preferredGreeting?: string | null;
}): Promise<WaAiCatalogReplyResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return null;

  const catalog = await getSafeWaCatalogUnits({ limit: 30, publicUrl: input.publicUrl });
  if (!catalog.ok) return null;

  if (catalog.units.length === 0) {
    return {
      reply: "Mohon maaf nggih, stok laptop ready saat ini sedang kosong/masih proses QC. Boleh saya catat kebutuhannya dulu, nanti admin infokan begitu unit yang cocok masuk?",
      recommendedUnitIds: [],
      candidateUnits: []
    };
  }

  const persona = await getWaAiPersonaPrompt();
  const greetingInstruction = buildGreetingInstruction(input.preferredGreeting);
  const systemPrompt = `${hardSafetyPreamble}\n\nSAPAAN:\n${greetingInstruction}\n\nGAYA BICARA (boleh diatur admin toko):\n${persona}`;
  const userContent = buildUserContent(catalog.units, input.messages);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_schema", json_schema: responseJsonSchema },
        temperature: 0.4
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = JSON.parse(content) as { reply?: unknown; recommendedUnitIds?: unknown };
    if (typeof parsed.reply !== "string" || !parsed.reply.trim()) return null;

    const candidateIds = new Set(catalog.units.map((unit) => unit.id));
    const recommendedUnitIds = Array.isArray(parsed.recommendedUnitIds)
      ? parsed.recommendedUnitIds.filter((id): id is string => typeof id === "string" && candidateIds.has(id))
      : [];

    return { reply: parsed.reply, recommendedUnitIds, candidateUnits: catalog.units };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
