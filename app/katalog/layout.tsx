import type { ReactNode } from "react";
import "./katalog-wide.css";
import { CatalogAnalytics } from "@/app/components/CatalogAnalytics";
import { FesiGate } from "@/app/components/FesiGate";
import { PublicTracking } from "@/app/components/PublicTracking";

export default function KatalogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PublicTracking />
      <CatalogAnalytics />
      <FesiGate />
    </>
  );
}
