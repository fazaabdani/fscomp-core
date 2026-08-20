import { NextResponse } from "next/server";
import { forbidden, hasStaffAccess } from "@/lib/api-auth";
import { getFolderContents } from "@/lib/media-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasStaffAccess(["admin", "teknisi"]))) return forbidden();

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folder") || null;
  const data = await getFolderContents(folderId);

  return NextResponse.json(data);
}
