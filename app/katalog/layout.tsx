import type { ReactNode } from "react";
import { CatalogAnalytics } from "@/app/components/CatalogAnalytics";
import { PublicTracking } from "@/app/components/PublicTracking";

export default function KatalogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PublicTracking />
      <CatalogAnalytics />
    </>
  );
}
