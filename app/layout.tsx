import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "FS Comp Core",
  description: "Manajemen unit, batch PSI, QC, label QR, dan AI reporting FS Comp."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const currentUser = getCurrentUser();

  return (
    <html lang="id">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">
            <span className="brandMark">FS</span>
            <span>
              <strong>FS Comp Core</strong>
              <small>Unit, QC, PSI, Label QR</small>
            </span>
          </Link>
          <nav>
            {currentUser ? (
              <>
                <Link href="/">Dashboard</Link>
                <Link href="/batch-psi">Batch PSI</Link>
                <Link href="/qc-harian">QC Harian</Link>
                <Link href="/qc-tools">QC Tools</Link>
                <Link href="/label">Label QR</Link>
              </>
            ) : null}
            <Link href="/login">{currentUser ? `${currentUser.name} (${currentUser.role})` : "Login"}</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
