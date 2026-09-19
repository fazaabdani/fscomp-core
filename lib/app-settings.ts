import { mediaAssetUrl, mediaThumbUrl } from "./media-data";
import { prisma } from "./prisma";

export type ThemePreference = "light" | "dark" | "elegant" | "rakit";
export type LayoutPreference = "topbar" | "sidebar";

const DEFAULT_THEME: ThemePreference = "dark";
const DEFAULT_LAYOUT: LayoutPreference = "topbar";

function toThemePreference(value: string | undefined): ThemePreference {
  if (value === "light" || value === "elegant" || value === "rakit") return value;
  return DEFAULT_THEME;
}

export async function getAppSettings() {
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: ["theme", "layout", "catalogFeatured"] } } });
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const theme = toThemePreference(map.get("theme"));
    const layout: LayoutPreference = map.get("layout") === "sidebar" ? "sidebar" : DEFAULT_LAYOUT;
    const catalogFeaturedEnabled = map.get("catalogFeatured") !== "off";
    return { theme, layout, catalogFeaturedEnabled };
  } catch {
    return { theme: DEFAULT_THEME, layout: DEFAULT_LAYOUT, catalogFeaturedEnabled: true };
  }
}

export async function setAppSetting(key: "theme" | "layout" | "catalogFeatured", value: string, updatedById: string | null) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value, updatedById },
    create: { key, value, updatedById }
  });
}

const ANNOUNCEMENT_KEYS = ["announcementEnabled", "announcementText", "announcementLink", "announcementImageAssetId"] as const;

export async function getCatalogAnnouncement() {
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: [...ANNOUNCEMENT_KEYS] } } });
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const enabled = map.get("announcementEnabled") === "on";
    const text = map.get("announcementText") ?? "";
    const link = map.get("announcementLink") ?? "";
    const imageAssetId = map.get("announcementImageAssetId") ?? "";

    let imageUrl = "";
    let imageThumbUrl = "";
    if (imageAssetId) {
      const asset = await prisma.mediaAsset.findUnique({ where: { id: imageAssetId }, select: { fileName: true } });
      if (asset) {
        imageUrl = mediaAssetUrl(asset.fileName);
        imageThumbUrl = mediaThumbUrl(asset.fileName);
      }
    }

    return { enabled, text, link, imageAssetId, imageUrl, imageThumbUrl };
  } catch {
    return { enabled: false, text: "", link: "", imageAssetId: "", imageUrl: "", imageThumbUrl: "" };
  }
}

export async function setCatalogAnnouncement(
  values: { enabled: boolean; text: string; link: string; imageAssetId: string },
  updatedById: string | null
) {
  const data: Record<(typeof ANNOUNCEMENT_KEYS)[number], string> = {
    announcementEnabled: values.enabled ? "on" : "off",
    announcementText: values.text,
    announcementLink: values.link,
    announcementImageAssetId: values.imageAssetId
  };

  await prisma.$transaction(
    ANNOUNCEMENT_KEYS.map((key) =>
      prisma.appSetting.upsert({
        where: { key },
        update: { value: data[key], updatedById },
        create: { key, value: data[key], updatedById }
      })
    )
  );
}
