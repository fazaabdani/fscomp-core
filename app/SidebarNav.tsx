"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getNavEntries, isGroupActive, isNavActive, type NavUser } from "./navLinks.data";

export function SidebarNav({ currentUser }: { currentUser: NavUser }) {
  const pathname = usePathname();
  const entries = getNavEntries(currentUser);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());

  useEffect(() => setMobileOpen(false), [pathname]);

  function toggleGroup(label: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <>
      <div className="sidebarMobileBar">
        <Link className="brand" href="/">
          <span className="brandMark">FS</span>
          <strong>FS Comp Core</strong>
        </Link>
        <button aria-label="Buka menu" className="iconButton" onClick={() => setMobileOpen(true)} type="button">
          <Menu size={20} />
        </button>
      </div>

      {mobileOpen ? <div className="sidebarBackdrop" onClick={() => setMobileOpen(false)} /> : null}

      <aside className={mobileOpen ? "sidebarShell open" : "sidebarShell"}>
        <div className="sidebarHeader">
          <Link className="brand" href="/">
            <span className="brandMark">FS</span>
            <span>
              <strong>FS Comp Core</strong>
              <small>Unit, QC, PSI, Label QR</small>
            </span>
          </Link>
          <button aria-label="Tutup menu" className="iconButton sidebarCloseButton" onClick={() => setMobileOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebarNav">
          {entries.map((entry) => {
            if (entry.kind === "group") {
              const visibleLinks = entry.links.filter((link) => link.show);
              if (visibleLinks.length === 0) return null;
              const active = isGroupActive(pathname, visibleLinks);
              const open = active || openGroups.has(entry.label);
              return (
                <div className="sidebarGroup" key={entry.label}>
                  <button
                    aria-expanded={open}
                    className={active ? "sidebarGroupTrigger activeNav" : "sidebarGroupTrigger"}
                    onClick={() => toggleGroup(entry.label)}
                    type="button"
                  >
                    {entry.label}
                  </button>
                  {open ? (
                    <div className="sidebarGroupMenu">
                      {visibleLinks.map((link) => (
                        <Link className={isNavActive(pathname, link.href) ? "activeNav" : ""} href={link.href} key={link.href}>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }
            if (!entry.show) return null;
            return (
              <Link className={isNavActive(pathname, entry.href) ? "activeNav" : ""} href={entry.href} key={entry.href}>
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebarFooter">
          <Link className={isNavActive(pathname, "/login") ? "activeNav" : ""} href="/login">
            {currentUser.name} ({currentUser.role})
          </Link>
        </div>
      </aside>
    </>
  );
}
