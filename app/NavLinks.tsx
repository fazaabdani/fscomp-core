"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getNavEntries, isGroupActive, isNavActive, type NavLink, type NavUser } from "./navLinks.data";

function NavDropdown({ label, links, pathname, menuClassName = "" }: { label: string; links: NavLink[]; pathname: string; menuClassName?: string }) {
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
        className={isGroupActive(pathname, visibleLinks) ? "activeNav" : ""}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {label}
      </button>
      <div className={`navDropdownMenu ${menuClassName} ${open ? "open" : ""}`} role="menu">
        {visibleLinks.map((link) => (
          <Link className={isNavActive(pathname, link.href) ? "activeNav" : ""} href={link.href} key={link.href} onClick={() => setOpen(false)}>
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
    return <Link className={isNavActive(pathname, "/login") ? "activeNav" : ""} href="/login">Login</Link>;
  }

  const entries = getNavEntries(currentUser);

  return (
    <>
      {entries.map((entry) => {
        if (entry.kind === "group") {
          return (
            <NavDropdown
              key={entry.label}
              label={entry.label}
              links={entry.links}
              pathname={pathname}
              menuClassName={entry.label === "Operasional" ? "navDropdownMenuWide" : ""}
            />
          );
        }
        if (!entry.show) return null;
        return (
          <Link className={isNavActive(pathname, entry.href) ? "activeNav" : ""} href={entry.href} key={entry.href}>
            {entry.label}
          </Link>
        );
      })}
      <Link className={isNavActive(pathname, "/login") ? "activeNav" : ""} href="/login">{currentUser.name} ({currentUser.role})</Link>
    </>
  );
}
