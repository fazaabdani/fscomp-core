"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { setAppSetting, setCatalogAnnouncement } from "@/lib/app-settings";

async function currentUserId(username: string) {
  const dbUser = await prisma.user.findFirst({ where: { username }, select: { id: true } });
  return dbUser?.id ?? null;
}

export async function updateThemeAction(formData: FormData) {
  const currentUser = await requireRole(["admin"]);
  const raw = formData.get("theme");
  const theme = raw === "light" || raw === "elegant" || raw === "rakit" ? raw : "dark";
  await setAppSetting("theme", theme, await currentUserId(currentUser.username));
  revalidatePath("/", "layout");
  redirect("/pengaturan?success=theme-updated");
}

export async function updateLayoutAction(formData: FormData) {
  const currentUser = await requireRole(["admin"]);
  const layout = formData.get("layout") === "sidebar" ? "sidebar" : "topbar";
  await setAppSetting("layout", layout, await currentUserId(currentUser.username));
  revalidatePath("/", "layout");
  redirect("/pengaturan?success=layout-updated");
}

export async function updateCatalogFeaturedAction(formData: FormData) {
  const currentUser = await requireRole(["admin"]);
  const enabled = formData.get("catalogFeatured") === "on";
  await setAppSetting("catalogFeatured", enabled ? "on" : "off", await currentUserId(currentUser.username));
  revalidatePath("/katalog");
  redirect("/pengaturan?success=catalog-featured-updated");
}

export async function updateAnnouncementAction(formData: FormData) {
  const currentUser = await requireRole(["admin"]);
  const enabled = formData.get("announcementEnabled") === "on";
  const text = String(formData.get("announcementText") ?? "").trim();
  const link = String(formData.get("announcementLink") ?? "").trim();
  const rawAssetId = String(formData.getAll("announcementImageAssetId")[0] ?? "").trim();

  let imageAssetId = "";
  if (rawAssetId) {
    const asset = await prisma.mediaAsset.findUnique({ where: { id: rawAssetId }, select: { id: true } });
    if (asset) imageAssetId = asset.id;
  }

  await setCatalogAnnouncement({ enabled, text, link, imageAssetId }, await currentUserId(currentUser.username));
  revalidatePath("/katalog");
  redirect("/pengaturan?success=announcement-updated");
}
