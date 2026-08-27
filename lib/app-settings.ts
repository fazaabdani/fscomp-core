import { prisma } from "./prisma";

export type ThemePreference = "light" | "dark" | "elegant";
export type LayoutPreference = "topbar" | "sidebar";

const DEFAULT_THEME: ThemePreference = "dark";
const DEFAULT_LAYOUT: LayoutPreference = "topbar";

function toThemePreference(value: string | undefined): ThemePreference {
  if (value === "light" || value === "elegant") return value;
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
