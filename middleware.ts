import { NextResponse, type NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname === "/register") return true;
  if (pathname === "/katalog" || pathname.startsWith("/katalog/")) return true;
  if (pathname.startsWith("/uploads/")) return true;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "unit" && parts[1] !== "new") return true;
  if (parts.length === 2 && parts[0] === "nota") return true;
  return false;
}

async function roleFromSession(session?: string) {
  const secret = process.env.SESSION_SECRET;
  if (!session || !secret || secret.length < 32) return null;
  try {
    const [payload, providedSignature, extra] = session.split(".");
    if (!payload || !providedSignature || extra) return null;
    const decode = (value: string) => {
      const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
      return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    };
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signature = decode(providedSignature);
    const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(payload));
    if (!valid) return null;
    const json = new TextDecoder().decode(decode(payload));
    const parsed = JSON.parse(json) as { role?: string; exp?: number };
    if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    if (parsed.role === "admin" || parsed.role === "teknisi" || parsed.role === "sales" || parsed.role === "magang") return parsed.role;
  } catch {
    return null;
  }
  return null;
}

function isMagangAllowedPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname === "/qc-harian") return true;
  if (pathname === "/qc-tools") return true;
  if (pathname === "/katalog") return true;
  if (pathname === "/label") return true;
  if (pathname === "/attendance") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("fscomp_user")?.value;
  const role = await roleFromSession(session);
  const hasSession = Boolean(role);

  if (role === "magang" && !isMagangAllowedPath(pathname) && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/qc-harian", request.url));
  }

  if (hasSession || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
