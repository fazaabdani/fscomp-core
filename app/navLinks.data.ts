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
  // Menu dikelompokkan berdasarkan pekerjaannya supaya tidak perlu menebak letaknya.
  const stockLinks: NavLink[] = [
    { href: "/inventory", label: "Inventaris", show: true },
    { href: "/kelola-sparepart", label: "Stok Sparepart", show: !isMagang },
    { href: "/supplier", label: "Supplier", show: !isMagang && currentUser.role !== "sales" },
    { href: "/retur", label: "Retur ke Supplier", show: !isMagang && currentUser.role !== "sales" },
    { href: "/media", label: "Media Foto Produk", show: currentUser.role === "admin" || currentUser.role === "teknisi" }
  ];
  const transactionLinks: NavLink[] = [
    { href: "/sales/non-laptop", label: "Kasir Non-Laptop", show: !isMagang },
    { href: "/rakit-pc", label: "Rakit PC", show: canSeeLicense },
    { href: "/licenses", label: "Lisensi", show: canSeeLicense },
    { href: "/sales/piutang", label: "Piutang", show: currentUser.role === "admin" },
    { href: "/sales/archive", label: "Arsip Penjualan", show: currentUser.role === "admin" }
  ];
  const marketingLinks: NavLink[] = [
    { href: "/analitik-katalog", label: "Analitik Katalog", show: currentUser.role === "admin" },
    { href: "/testimoni", label: "Testimoni Katalog", show: currentUser.role === "admin" },
    { href: "/wa-ai", label: "AI WhatsApp", show: canSeeLicense },
    { href: "/asisten-ai", label: "Asisten AI", show: !isMagang }
  ];
  const adminLinks: NavLink[] = [
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
    { kind: "group", label: "Stok", links: stockLinks },
    { kind: "group", label: "Transaksi", links: transactionLinks },
    { kind: "group", label: "Pemasaran", links: marketingLinks },
    { kind: "group", label: "Admin", links: adminLinks },
    { kind: "link", href: "/users", label: "User", show: currentUser.role === "admin" }
  ];
}
