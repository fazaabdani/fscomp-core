import type { ReactNode } from "react";
import { PublicTracking } from "@/app/components/PublicTracking";

export default function UnitLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PublicTracking />
    </>
  );
}
