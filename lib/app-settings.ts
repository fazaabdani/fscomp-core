import { prisma } from "./prisma";

export type ThemePreference = "light" | "dark";
export type LayoutPreference = "topbar" | "sidebar";

const DEFAULT_THEME: ThemePreference = "dark";
const DEFAULT_LAYOUT: LayoutPreference = "topbar";

export async function getAppSettings() {
  try {
    const rows = await prisma.appSetting.findMany({ where: { key: { in: ["theme", "layout"] } } });
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const theme: ThemePreference = map.get("theme") === "light" ? "light" : DEFAULT_THEME;
    const layout: LayoutPreference = map.get("layout") === "sidebar" ? "sidebar" : DEFAULT_LAYOUT;
    return { theme, layout };
  } catch {
    return { theme: DEFAULT_THEME, layout: DEFAULT_LAYOUT };
  }
}

export async function setAppSetting(key: "theme" | "layout", value: string, updatedById: string | null) {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value, updatedById },
    create: { key, value, updatedById }
  });
}
