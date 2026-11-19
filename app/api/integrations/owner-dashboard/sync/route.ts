import { NextResponse } from "next/server";
import { forbidden, hasIntegrationAccess, hasStaffAccess } from "@/lib/api-auth";
import { buildIngestEntries, getOwnerSummary, ownerDashboardConfig, pushToOwnerDashboard } from "@/lib/owner-dashboard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await hasStaffAccess(["admin"])) && !hasIntegrationAccess(request, "CORE_INTEGRATION_TOKEN")) return forbidden();

  if (!ownerDashboardConfig()) {
    return NextResponse.json(
      { status: "not_configured", message: "OWNER_DASHBOARD_URL / OWNER_DASHBOARD_TOKEN belum diatur di environment." },
      { status: 400 }
    );
  }

  const summary = await getOwnerSummary();
  const entries = buildIngestEntries(summary);
  const result = await pushToOwnerDashboard(entries);

  return NextResponse.json({
    status: "synced",
    generatedAt: summary.generatedAt,
    ...result
  });
}
