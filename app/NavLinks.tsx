"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavUser = {
  name: string;
  role: "admin" | "teknisi" | "sales" | "magang";
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ currentUser }: { currentUser: NavUser | null }) {
  const pathname = usePathname();

  if (!currentUser) {
    return <Link className={isActive(pathname, "/login") ? "activeNav" : ""} href="/login">Login</Link>;
  }

  const isMagang = currentUser.role === "magang";
  const links = [
    { href: "/", label: "Dashboard", show: !isMagang },
    { href: "/batch-psi", label: "Batch", show: !isMagang },
    { href: "/qc-harian", label: "QC Harian", show: true },
    { href: "/qc-tools", label: "QC Tools", show: true },
    { href: "/katalog", label: "Katalog", show: true },
    { href: "/label", label: "Label QR", show: true },
    { href: "/attendance", label: "Absensi", show: true },
    { href: "/sales", label: "Penjualan", show: !isMagang },
    { href: "/users", label: "User", show: currentUser.role === "admin" }
  ];

  return (
    <>
      {links.filter((link) => link.show).map((link) => (
        <Link className={isActive(pathname, link.href) ? "activeNav" : ""} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
      <Link className={isActive(pathname, "/login") ? "activeNav" : ""} href="/login">{currentUser.name} ({currentUser.role})</Link>
    </>
  );
}
