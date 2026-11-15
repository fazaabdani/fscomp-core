import { NextResponse, type NextRequest } from "next/server";
import { createRateLimiter, isBotUserAgent } from "@/lib/catalog-analytics";
import { buildLeadMessage, createLeadDeduper, isOpenHours, sanitizeLead } from "@/lib/fesi-lead";
import { INTERNAL_COOKIE } from "@/lib/internal-traffic";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";
import { sendTelegramLead, telegramLeadConfigured } from "@/lib/telegram";
import { displayUnitNumber } from "@/lib/unit-number";

export const dynamic = "force-dynamic";

// Endpoint PUBLIK: semua input tidak tepercaya. Dibatasi ukuran, asal (Origin), bot/staf ditolak, ada pembatas laju
// dan penghapus duplikat. Selalu menjawab 204 supaya tidak bisa dipakai untuk "meraba" aturan validasi.
const perVisitor = createRateLimiter(6, 60 * 60 * 1000);
const overall = createRateLimiter(40, 60 * 60 * 1000);
const firstTime = createLeadDeduper(15 * 60 * 1000);
const MAX_BODY = 2000;

export async function POST(request: NextRequest) {
  const done = () => new NextResponse(null, { status: 204 });
  try {
    if (!telegramLeadConfigured()) return done();
    if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY) return done();

    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return done();
      } catch {
        return done();
      }
    }
    if (isBotUserAgent(request.headers.get("user-agent"))) return done();
    if (request.cookies.get(SESSION_COOKIE_NAME)?.value || request.cookies.get(INTERNAL_COOKIE)?.value === "1") return done();

    const body = await request.text();
    if (body.length > MAX_BODY) return done();
    const lead = sanitizeLead(JSON.parse(body));
    if (!lead) return done();
    if (!overall("all") || !perVisitor(lead.sessionId)) return done();
    if (!firstTime(`${lead.sessionId}:${lead.clickedUnitId ?? "admin"}`)) return done();

    const ids = Array.from(new Set((lead.clickedUnitId ? [lead.clickedUnitId] : []).concat(lead.shownUnitIds)));
    const rows = ids.length
      ? await prisma.unit.findMany({
          where: { id: { in: ids } },
          select: { id: true, nomorUnit: true, model: true, hargaJualRekomendasi: true, stockLocation: true }
        })
      : [];
    const units = rows.map((u) => ({
      id: u.id,
      nomorUnit: displayUnitNumber(u.nomorUnit),
      model: u.model,
      price: u.hargaJualRekomendasi,
      lokasi: u.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen"
    }));
    const now = new Date();
    // Di luar jam buka, alert dikirim senyap (tanpa bunyi) supaya admin tidak terganggu malam hari.
    await sendTelegramLead(buildLeadMessage(lead, units, now), !isOpenHours(now));
  } catch {
    // Peringatan tidak boleh pernah mengganggu pengunjung.
  }
  return done();
}
