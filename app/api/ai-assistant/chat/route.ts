import { NextResponse } from "next/server";
import { isAiAssistantRateLimited } from "@/lib/ai-assistant-rate-limit";
import { assistantToolSchemas, executeAssistantTool } from "@/lib/ai-assistant-tools";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "teknisi", "sales"] as const;
const MAX_TOOL_ROUNDS = 3;

const systemPrompt = [
  "Kamu adalah asisten internal untuk staff toko laptop FS Comp, dipakai lewat halaman admin (bukan WhatsApp customer).",
  "ATURAN WAJIB:",
  "1. Jawab HANYA berdasarkan data yang didapat dari pemanggilan tool. Jangan pernah mengarang nomor unit, harga, status, atau angka keuangan.",
  "2. Kalau data dari tool tidak cukup untuk menjawab, bilang terus terang datanya tidak ada/tidak cukup - jangan menebak.",
  "3. Kalau tool mengembalikan pesan error atau penolakan akses, sampaikan apa adanya ke user, jangan dilewati atau dicoba akali.",
  "4. Selalu balas dalam Bahasa Indonesia, singkat dan jelas, format angka rupiah dengan pemisah ribuan.",
  "5. Ini alat bantu baca data saja - kamu tidak bisa dan tidak boleh berpura-pura membuat transaksi, mengubah status unit, atau tindakan lain."
].join("\n");

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user || !ALLOWED_ROLES.includes(user.role as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: "Tidak punya akses ke asisten ini." }, { status: 403 });
  }

  if (isAiAssistantRateLimited(user.username)) {
    return NextResponse.json({ error: "Terlalu banyak pertanyaan dalam waktu singkat, coba lagi beberapa menit lagi." }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) {
    return NextResponse.json({ error: "Asisten belum aktif - OPENAI_API_KEY/OPENAI_MODEL belum dikonfigurasi." }, { status: 503 });
  }

  let body: { messages?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
  }

  const history = Array.isArray(body.messages)
    ? body.messages
        .filter((message): message is ChatMessage => (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
        .slice(-20)
    : [];

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Pertanyaan kosong." }, { status: 400 });
  }

  const conversation: Array<{ role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string; name?: string }> = [
    { role: "system", content: systemPrompt },
    ...history
  ];
  const toolsUsed: string[] = [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: conversation,
          tools: assistantToolSchemas,
          tool_choice: "auto",
          temperature: 0.2
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Asisten sedang bermasalah, coba lagi sebentar lagi." }, { status: 502 });
      }

      const data = await response.json();
      const message = data?.choices?.[0]?.message;
      if (!message) {
        return NextResponse.json({ error: "Asisten tidak memberi jawaban, coba lagi." }, { status: 502 });
      }

      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      if (toolCalls.length === 0) {
        const reply = typeof message.content === "string" && message.content.trim() ? message.content : "Maaf, saya belum bisa menjawab itu.";
        return NextResponse.json({ reply, toolsUsed });
      }

      conversation.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });

      for (const call of toolCalls) {
        const toolName = call?.function?.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call?.function?.arguments || "{}");
        } catch {
          args = {};
        }
        toolsUsed.push(toolName);
        const result = await executeAssistantTool(toolName, args, user);
        conversation.push({ role: "tool", tool_call_id: call.id, name: toolName, content: JSON.stringify(result) });
      }
    }

    return NextResponse.json({ error: "Pertanyaan ini butuh terlalu banyak langkah, coba dipersempit." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Asisten tidak merespons, coba lagi." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
