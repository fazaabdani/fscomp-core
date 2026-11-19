import { NextResponse } from "next/server";
import { forbidden, hasIntegrationAccess, hasStaffAccess } from "@/lib/api-auth";
import { getOwnerSummary } from "@/lib/owner-dashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasStaffAccess(["admin"])) && !hasIntegrationAccess(request, "CORE_INTEGRATION_TOKEN")) return forbidden();

  const summary = await getOwnerSummary();
  const { monthSalesForIngest, ...publicSummary } = summary;

  return NextResponse.json(publicSummary);
}
