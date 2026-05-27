import { NextResponse, type NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname === "/katalog") return true;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "unit" && parts[1] !== "new") return true;
  if (parts.length === 2 && parts[0] === "nota") return true;
  return false;
}

function roleFromSession(session?: string) {
  if (!session) return null;
  try {
    const parsed = JSON.parse(session) as { role?: string };
    if (parsed.role === "admin") return "admin";
    if (parsed.role === "teknisi") return "teknisi";
    if (parsed.role === "magang") return "magang";
  } catch {
    if (session === "admin") return "admin";
    if (session === "teknisi") return "teknisi";
    if (session === "pkl") return "magang";
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("fscomp_user")?.value;
  const hasSession = Boolean(session);
  const role = roleFromSession(session);

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
