import { NextResponse } from "next/server";
import { forbidden, hasStaffAccess } from "@/lib/api-auth";
import { createMediaAsset } from "@/lib/media-upload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await hasStaffAccess(["admin", "teknisi"]))) return forbidden();

  const formData = await request.formData();
  const folderId = String(formData.get("folderId") ?? "").trim() || null;
  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "no-files" }, { status: 400 });
  }

  const assets = [];
  let failed = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      assets.push(await createMediaAsset(buffer, folderId, file.name || "foto.webp"));
    } catch {
      failed += 1;
    }
  }

  return NextResponse.json({ assets, failed });
}
