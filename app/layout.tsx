import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { getAppSettings } from "@/lib/app-settings";
import { getCurrentUser } from "@/lib/session";
import { NavLinks } from "./NavLinks";
import { PageTransition } from "./PageTransition";
import { SidebarNav } from "./SidebarNav";
import { ThemeDynamics } from "./ThemeDynamics";
import "./globals.css";
import "./ops-overrides.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "FS Comp Core",
  description: "Manajemen unit, batch, QC, label QR, dan AI reporting FS Comp."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [currentUser, { theme, layout }] = await Promise.all([getCurrentUser(), getAppSettings()]);
  const useSidebar = layout === "sidebar" && Boolean(currentUser);

  return (
    <html lang="id" data-theme={theme} data-layout={layout}>
      <body className={`${inter.variable} ${fraunces.variable}`}>
        <ThemeDynamics resolvedTheme={theme} />
        {useSidebar && currentUser ? (
          <div className="appShell">
            <SidebarNav currentUser={currentUser} />
            <div className="appShellMain">
              <main>
                <PageTransition>{children}</PageTransition>
              </main>
              <footer className="siteFooter">
                <span>Dibuat oleh</span>
                <strong>Faza Abdani Auni Robbi S.T</strong>
              </footer>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </body>
    </html>
  );
}
