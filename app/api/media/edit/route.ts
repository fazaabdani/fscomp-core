import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { forbidden, hasStaffAccess } from "@/lib/api-auth";
import { entityId } from "@/lib/form-validation";
import { createEditedMediaAsset, isNeutralAdjust, parsePhotoAdjust } from "@/lib/media-edit";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as { assetId?: unknown; unitId?: unknown }) : {};
  const rawUnitId = record.unitId;
  const hasUnit = rawUnitId !== undefined && rawUnitId !== null && rawUnitId !== "";

  // Mengganti foto langsung di unit (halaman detail/katalog) khusus admin; edit di formulir unit boleh admin/teknisi.
  if (!(await hasStaffAccess(hasUnit ? ["admin"] : ["admin", "teknisi"]))) return forbidden();

  const adjust = parsePhotoAdjust(body);
  if (!entityId.safeParse(record.assetId).success || !adjust || (hasUnit && !entityId.safeParse(rawUnitId).success)) {
    return NextResponse.json({ error: "invalid-input" }, { status: 400 });
  }
  if (isNeutralAdjust(adjust)) {
    return NextResponse.json({ error: "no-change" }, { status: 400 });
  }

  const assetId = String(record.assetId);
  const unitId = hasUnit ? String(rawUnitId) : null;

  if (unitId) {
    const link = await prisma.unitPhoto.findUnique({ where: { unitId_assetId: { unitId, assetId } }, select: { id: true } });
    if (!link) return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  try {
    const asset = await createEditedMediaAsset(assetId, adjust);
    if (!asset) return NextResponse.json({ error: "not-found" }, { status: 404 });

    if (unitId) {
      const actor = await getCurrentUser();
      await prisma.$transaction([
        prisma.unitPhoto.update({ where: { unitId_assetId: { unitId, assetId } }, data: { assetId: asset.id } }),
        prisma.unitAuditLog.create({
          data: {
            unitId,
            action: "EDIT_PHOTO",
            actorName: actor?.name ?? "Admin",
            actorUsername: actor?.username ?? null,
            actorRole: actor?.role ?? null,
            changes: [{ field: "foto", before: assetId, after: asset.id, ...adjust }]
          }
        })
      ]);
      revalidatePath(`/unit/${unitId}`);
      revalidatePath("/katalog");
      revalidatePath("/");
    }

    return NextResponse.json({ asset });
  } catch {
    return NextResponse.json({ error: "edit-failed" }, { status: 500 });
  }
}
