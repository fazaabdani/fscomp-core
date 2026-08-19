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
        select: {
          id: true,
          category: true,
          name: true,
          brand: true,
          specification: true,
          salePrice: true,
          inventoryItemId: true,
          socket: true,
          supportedSockets: true,
          memoryType: true,
          formFactor: true,
          supportedFormFactors: true,
          storageInterface: true,
          supportedStorageInterfaces: true,
          powerDraw: true,
          psuCapacity: true,
          gpuLengthMm: true,
          maxGpuLengthMm: true,
          coolerHeightMm: true,
          maxCoolerHeightMm: true,
          radiatorSizeMm: true,
          supportedRadiatorSizes: true
        }
      }),
      prisma.pcBuildPreset.findMany({
        where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { items: { select: { componentId: true } } }
      })
    ]);
    const availableIds=new Set(components.map(component=>component.id));
    const availablePresets=presets.filter(preset=>preset.items.length>0&&preset.items.every(item=>availableIds.has(item.componentId)));
    return { connected: true, components, presets:availablePresets };
  } catch {
    return { connected: false, components: [], presets: [] };
  }
}
