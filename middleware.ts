import { NextResponse, type NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname === "/katalog") return true;
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "unit" && parts[1] !== "new") return true;
  if (parts.length === 2 && parts[0] === "nota") return true;
  return false;
}

function roleFromUsername(username?: string) {
  if (username === "admin") return "admin";
  if (username === "teknisi") return "teknisi";
  if (username === "pkl") return "magang";
  return null;
}

function isMagangAllowedPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname === "/qc-harian") return true;
  if (pathname === "/qc-tools") return true;
  if (pathname === "/katalog") return true;
  if (pathname === "/label") return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const username = request.cookies.get("fscomp_user")?.value;
  const hasSession = Boolean(username);
  const role = roleFromUsername(username);

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
