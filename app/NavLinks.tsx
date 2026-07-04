"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavUser = {
  name: string;
  role: "admin" | "teknisi" | "sales" | "magang";
};

type NavLink = {
  href: string;
  label: string;
  show: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupActive(pathname: string, links: NavLink[]) {
  return links.some((link) => link.show && isActive(pathname, link.href));
}

function NavDropdown({ label, links, pathname }: { label: string; links: NavLink[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const visibleLinks = links.filter((link) => link.show);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    function closeFromOutside(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeFromOutside);
    return () => document.removeEventListener("pointerdown", closeFromOutside);
  }, []);

  if (visibleLinks.length === 0) return null;

  return (
    <div className={`navDropdown ${open ? "open" : ""}`} ref={dropdownRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={groupActive(pathname, visibleLinks) ? "activeNav" : ""}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {label}
      </button>
      <div className={`navDropdownMenu ${open ? "open" : ""}`} role="menu">
        {visibleLinks.map((link) => (
          <Link className={isActive(pathname, link.href) ? "activeNav" : ""} href={link.href} key={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function NavLinks({ currentUser }: { currentUser: NavUser | null }) {
  const pathname = usePathname();

  if (!currentUser) {
    return <Link className={isActive(pathname, "/login") ? "activeNav" : ""} href="/login">Login</Link>;
  }

  const isMagang = currentUser.role === "magang";
  const canSeeLicense = currentUser.role === "admin" || currentUser.role === "sales";
  const qcLinks = [
    { href: "/qc-harian", label: "QC Harian", show: true },
    { href: "/qc-tools", label: "QC Tools", show: true }
  ];
  const operationLinks = [
    { href: "/inventory", label: "Inventaris", show: true },
    { href: "/sales/non-laptop", label: "Kasir Non-Laptop", show: !isMagang },
    { href: "/sales/archive", label: "Arsip Penjualan", show: currentUser.role === "admin" },
    { href: "/rakit-pc", label: "Rakit PC", show: canSeeLicense },
    { href: "/licenses", label: "Lisensi", show: canSeeLicense },
    { href: "/wa-ai", label: "AI WhatsApp", show: canSeeLicense }
  ];
  const links = [
    { href: "/", label: "Dashboard", show: !isMagang },
    { href: "/batch-psi", label: "Batch", show: !isMagang },
    { href: "/katalog", label: "Katalog", show: true },
    { href: "/label", label: "Label QR", show: true },
    { href: "/attendance", label: "Absensi", show: true },
    { href: "/sales", label: "Penjualan", show: !isMagang },
    { href: "/users", label: "User", show: currentUser.role === "admin" }
  ];

  return (
    <>
      {links.slice(0, 2).filter((link) => link.show).map((link) => (
        <Link className={isActive(pathname, link.href) ? "activeNav" : ""} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
      <NavDropdown label="QC" links={qcLinks} pathname={pathname} />
      {links.slice(2, 6).filter((link) => link.show).map((link) => (
        <Link className={isActive(pathname, link.href) ? "activeNav" : ""} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
      <NavDropdown label="Operasional" links={operationLinks} pathname={pathname} />
      {links.slice(6).filter((link) => link.show).map((link) => (
        <Link className={isActive(pathname, link.href) ? "activeNav" : ""} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
      <Link className={isActive(pathname, "/login") ? "activeNav" : ""} href="/login">{currentUser.name} ({currentUser.role})</Link>
    </>
  );
}
