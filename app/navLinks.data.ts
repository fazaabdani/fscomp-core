export type NavUser = {
  name: string;
  role: "admin" | "teknisi" | "sales" | "magang";
};

export type NavLink = {
  href: string;
  label: string;
  show: boolean;
};

export type NavEntry =
  | ({ kind: "link" } & NavLink)
  | { kind: "group"; label: string; links: NavLink[] };

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isGroupActive(pathname: string, links: NavLink[]) {
  return links.some((link) => link.show && isNavActive(pathname, link.href));
}

export function getNavEntries(currentUser: NavUser): NavEntry[] {
  const isMagang = currentUser.role === "magang";
  const canSeeLicense = currentUser.role === "admin" || currentUser.role === "sales";

  const qcLinks: NavLink[] = [
    { href: "/qc-harian", label: "QC Harian", show: true },
    { href: "/qc-tools", label: "QC Tools", show: true }
  ];
  const operationLinks: NavLink[] = [
    { href: "/inventory", label: "Inventaris", show: true },
    { href: "/media", label: "Media Foto Produk", show: currentUser.role === "admin" || currentUser.role === "teknisi" },
    { href: "/sales/non-laptop", label: "Kasir Non-Laptop", show: !isMagang },
    { href: "/sales/archive", label: "Arsip Penjualan", show: currentUser.role === "admin" },
    { href: "/rakit-pc", label: "Rakit PC", show: canSeeLicense },
    { href: "/licenses", label: "Lisensi", show: canSeeLicense },
    { href: "/wa-ai", label: "AI WhatsApp", show: canSeeLicense },
    { href: "/asisten-ai", label: "Asisten AI", show: !isMagang },
    { href: "/owner-dashboard", label: "Owner Dashboard", show: currentUser.role === "admin" },
    { href: "/pengaturan", label: "Pengaturan", show: currentUser.role === "admin" }
  ];

  return [
    { kind: "link", href: "/", label: "Dashboard", show: !isMagang },
    { kind: "link", href: "/batch-psi", label: "Batch", show: !isMagang },
    { kind: "group", label: "QC", links: qcLinks },
    { kind: "link", href: "/katalog", label: "Katalog", show: true },
    { kind: "link", href: "/label", label: "Label QR", show: true },
    { kind: "link", href: "/attendance", label: "Absensi", show: true },
    { kind: "link", href: "/sales", label: "Penjualan", show: !isMagang },
    { kind: "group", label: "Operasional", links: operationLinks },
    { kind: "link", href: "/users", label: "User", show: currentUser.role === "admin" }
  ];
}
