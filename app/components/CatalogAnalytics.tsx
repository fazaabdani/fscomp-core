import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { INTERNAL_COOKIE, isInternalTraffic } from "@/lib/internal-traffic";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";
import { CatalogAnalyticsClient } from "./CatalogAnalyticsClient";

// Dipasang di layout halaman publik. Staf yang sedang login dilewati (dobel pengaman: endpoint juga menolaknya).
export function CatalogAnalytics() {
  if (cookies().get(SESSION_COOKIE_NAME)?.value) return null;
  if (isInternalTraffic(cookies().get(INTERNAL_COOKIE)?.value, headers().get("host"))) return null;
  return (
    <Suspense fallback={null}>
      <CatalogAnalyticsClient />
    </Suspense>
  );
}
