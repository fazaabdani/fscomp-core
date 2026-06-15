import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { NavLinks } from "./NavLinks";
import { PageTransition } from "./PageTransition";
import { ThemeDynamics } from "./ThemeDynamics";
import "./globals.css";
import "./ops-overrides.css";

export const metadata: Metadata = {
  title: "FS Comp Core",
  description: "Manajemen unit, batch, QC, label QR, dan AI reporting FS Comp."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const currentUser = getCurrentUser();

  return (
    <html lang="id">
      <body>
        <ThemeDynamics />
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brandMark">FS</span>
            <span>
              <strong>FS Comp Core</strong>
              <small>Unit, QC, PSI, Label QR</small>
            </span>
          </Link>
          <nav>
            <NavLinks currentUser={currentUser} />
          </nav>
        </header>
        <main>
          <PageTransition>{children}</PageTransition>
        </main>
        <footer className="siteFooter">
          <span>Dibuat oleh</span>
          <strong>Faza Abdani Auni Robbi S.T</strong>
        </footer>
      </body>
    </html>
  );
}
