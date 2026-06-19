import { prisma } from "./prisma";

export const pcCategoryLabels: Record<string, string> = {
  CPU: "Processor", MOTHERBOARD: "Motherboard", RAM: "RAM", STORAGE: "Storage",
  GPU: "Kartu grafis", PSU: "Power supply", CASING: "Casing", COOLER: "Cooler",
  MONITOR: "Monitor", ACCESSORY: "Aksesori"
};

export async function getPublicPcBuilderData() {
  try {
    const [components, presets] = await Promise.all([
      prisma.pcComponent.findMany({
        where: { active: true, OR: [{ inventoryItemId: null }, { inventoryItem: { status: "STOCK" } }] },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { salePrice: "asc" }],
        include: { inventoryItem: { select: { id: true, status: true, serialNumber: true } } }
      }),
      prisma.pcBuildPreset.findMany({
        where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { items: { select: { componentId: true } } }
      })
    ]);
    return { connected: true, components, presets };
  } catch {
    return { connected: false, components: [], presets: [] };
  }
}
