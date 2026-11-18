"use client";

import { usePathname } from "next/navigation";
import { FesiWidget } from "./FesiWidget";

// Fesi menanyakan kebutuhan laptop dan merekomendasikan laptop; di halaman katalog PC itu tidak relevan.
export function FesiGate() {
  const pathname = usePathname() ?? "";
  if (pathname === "/katalog/pc" || pathname.startsWith("/katalog/pc/")) return null;
  return <FesiWidget />;
}
