import { NextResponse, type NextRequest } from "next/server";
import { createRateLimiter, sanitizeEvent } from "@/lib/catalog-analytics";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";

export const dynamic = "force-dynamic";

// Endpoint PUBLIK (API dikecualikan dari middleware login) -> semua input tidak tepercaya: ukuran dibatasi,
// payload divalidasi ketat (lib/catalog-analytics.ts), bot & staf login ditolak, dan ada pembatas laju.
// Selalu menjawab 204 supaya tidak bisa dipakai untuk "meraba" aturan validasi.
const perVisitor = createRateLimiter(240, 60 * 60 * 1000);
const overall = createRateLimiter(1500, 60 * 1000);
const MAX_BODY = 4000;

export async function POST(request: NextRequest) {
  const done = () => new NextResponse(null, { status: 204 });
  try {
    if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY) return done();

    // Hanya dari halaman kita sendiri (Origin, bila dikirim browser, harus sama dengan host).
    const origin = request.headers.get("origin");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) return done();
      } catch {
        return done();
      }
    }

    const body = await request.text();
    if (body.length > MAX_BODY) return done();
    const event = sanitizeEvent(JSON.parse(body), {
      userAgent: request.headers.get("user-agent"),
      hasStaffSession: Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value)
    });
    if (!event) return done();
    if (!overall("all") || !perVisitor(event.visitorId)) return done();

    await prisma.catalogEvent.create({ data: event });
  } catch {
    // Analitik tidak boleh pernah mengganggu pengunjung.
  }
  return done();
}
