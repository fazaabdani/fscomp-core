import { NextResponse, type NextRequest } from "next/server";
import { INTERNAL_COOKIE, INTERNAL_COOKIE_MAX_AGE } from "@/lib/internal-traffic";

export const dynamic = "force-dynamic";

// Tandai / lepas penanda "internal" untuk PERANGKAT ini saja (cookie di browser yang membuka tautan).
// Aman dibuka publik: efeknya hanya membuat browser itu sendiri tidak dihitung di analitik, tidak memberi akses apa pun.
//   /api/internal-traffic?set=on   -> tandai perangkat ini internal
//   /api/internal-traffic?set=off  -> lepas penanda
//   /api/internal-traffic          -> lihat status
function page(title: string, body: string) {
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:12vh auto;padding:0 20px;line-height:1.6;color:#1f2933}a{color:#0f5fd7}.box{padding:18px 20px;border:1px solid #d6dbe3;border-radius:12px}</style></head>
<body><div class="box"><h1 style="font-size:20px;margin:0 0 8px">${title}</h1>${body}</div></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("set");
  const active = request.cookies.get(INTERNAL_COOKIE)?.value === "1";
  const secure = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";

  if (mode === "on" || mode === "off") {
    const response = page(
      mode === "on" ? "Perangkat ini ditandai sebagai internal" : "Penanda internal dilepas",
      mode === "on"
        ? "<p>Kunjungan dari browser ini <strong>tidak akan dihitung</strong> di Google Analytics, Meta Pixel, maupun Analitik Katalog. Berlaku sekitar 1 tahun atau sampai data browser dihapus.</p><p>Untuk menggunakannya sebagai pengunjung biasa lagi: <a href=\"/api/internal-traffic?set=off\">lepas penanda</a>.</p>"
        : "<p>Browser ini kembali dihitung sebagai pengunjung biasa.</p><p><a href=\"/api/internal-traffic?set=on\">Tandai internal lagi</a></p>"
    );
    response.cookies.set(INTERNAL_COOKIE, mode === "on" ? "1" : "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: mode === "on" ? INTERNAL_COOKIE_MAX_AGE : 0
    });
    return response;
  }

  return page(
    active ? "Perangkat ini: internal" : "Perangkat ini: dihitung sebagai pengunjung",
    active
      ? "<p>Kunjungan dari browser ini <strong>tidak dihitung</strong>. <a href=\"/api/internal-traffic?set=off\">Lepas penanda</a></p>"
      : "<p>Kunjungan dari browser ini dihitung seperti pengunjung biasa. <a href=\"/api/internal-traffic?set=on\">Tandai sebagai internal</a></p>"
  );
}
