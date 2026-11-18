import { prisma } from "./prisma";

// Katalog non-laptop (/katalog/pc): PC set, PC only, all-in-one, monitor, aksesoris, komponen satuan, dan paket rakitan.
// Laptop TIDAK lewat sini (tetap Unit + BatchPSI). Sumber data:
//  - InventoryItem yang ditandai catalogPublic (status STOCK, salePrice > 0)
//  - PcComponent aktif (harga jual sudah ada untuk Rakit PC) supaya bisa dibeli satuan
//  - PcBuildPreset aktif (paket rakitan), harga = jumlah komponennya

export const CATALOG_KINDS = ["PC_SET", "PC_ONLY", "AIO", "MONITOR", "ACCESSORY", "COMPONENT"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const KIND_LABEL: Record<CatalogKind, string> = {
  PC_SET: "PC set",
  PC_ONLY: "PC only",
  AIO: "All-in-one",
  MONITOR: "Monitor",
  ACCESSORY: "Aksesoris",
  COMPONENT: "Komponen"
};

export function isCatalogKind(value: string | null | undefined): value is CatalogKind {
  return Boolean(value) && (CATALOG_KINDS as readonly string[]).includes(value as string);
}

const COMPONENT_LABEL: Record<string, string> = {
  CPU: "Prosesor",
  MOTHERBOARD: "Motherboard",
  RAM: "RAM",
  STORAGE: "Penyimpanan",
  GPU: "Kartu grafis",
  PSU: "Power supply",
  CASING: "Casing",
  COOLER: "Pendingin",
  MONITOR: "Monitor",
  ACCESSORY: "Aksesoris"
};

export type PcCatalogItem = {
  key: string;
  kindLabel: string;
  name: string;
  subtitle: string | null;
  includes: string | null;
  condition: "SECOND" | "NEW" | null;
  price: number;
  priceFrom?: boolean;
  image: string | null;
  warrantyNote: string | null;
  availability: "READY" | "PREORDER";
  waText: string;
};

export type PcCatalogData = {
  connected: boolean;
  sets: PcCatalogItem[];
  monitors: PcCatalogItem[];
  parts: PcCatalogItem[];
  accessories: PcCatalogItem[];
};

const clean = (value: string | null | undefined) => {
  const text = (value ?? "").trim();
  return text ? text : null;
};

const rupiah = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;

function waText(name: string, price: number, extra?: string) {
  return [`Halo FS Comp, saya tertarik dengan ${name}.`, `Harga di katalog PC: ${rupiah(price)}.`, extra ?? "Apakah masih tersedia?"].join("\n");
}

export async function getPcCatalogData(): Promise<PcCatalogData> {
  try {
    const [inventory, components, presets] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { catalogPublic: true, status: "STOCK", salePrice: { gt: 0 }, catalogKind: { in: [...CATALOG_KINDS] } },
        orderBy: [{ catalogSort: "asc" }, { createdAt: "desc" }]
      }),
      prisma.pcComponent.findMany({
        where: { active: true, OR: [{ inventoryItemId: null }, { inventoryItem: { status: "STOCK" } }] },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { salePrice: "asc" }],
        include: { inventoryItem: { select: { condition: true, catalogImageUrl: true, catalogWarrantyNote: true } } }
      }),
      prisma.pcBuildPreset.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { items: { select: { componentId: true } } }
      })
    ]);

    const fromInventory = (item: (typeof inventory)[number]): { kind: CatalogKind; row: PcCatalogItem } => {
      const kind = item.catalogKind as CatalogKind;
      const name = item.name;
      const price = item.salePrice ?? 0;
      return {
        kind,
        row: {
          key: `inv-${item.id}`,
          kindLabel: KIND_LABEL[kind],
          name,
          subtitle: clean(item.specification) ?? clean(item.brandModel),
          includes: clean(item.catalogIncludes),
          condition: item.condition,
          price,
          image: clean(item.catalogImageUrl),
          warrantyNote: clean(item.catalogWarrantyNote),
          availability: "READY",
          waText: waText(name, price)
        }
      };
    };

    const sets: PcCatalogItem[] = [];
    const monitors: PcCatalogItem[] = [];
    const parts: PcCatalogItem[] = [];
    const accessories: PcCatalogItem[] = [];

    for (const item of inventory) {
      const { kind, row } = fromInventory(item);
      if (kind === "PC_SET" || kind === "PC_ONLY" || kind === "AIO") sets.push(row);
      else if (kind === "MONITOR") monitors.push(row);
      else if (kind === "ACCESSORY") accessories.push(row);
      else parts.push(row);
    }

    const componentById = new Map(components.map((component) => [component.id, component]));

    // Paket rakitan: hanya bila semua komponennya masih tersedia (aturan yang sama dengan halaman Rakit PC).
    for (const preset of presets) {
      const priced = preset.items.map((entry) => componentById.get(entry.componentId));
      if (priced.length === 0 || priced.some((component) => !component)) continue;
      const price = priced.reduce((sum, component) => sum + (component?.salePrice ?? 0), 0);
      if (price <= 0) continue;
      sets.push({
        key: `preset-${preset.id}`,
        kindLabel: "PC rakitan",
        name: `PC rakitan ${preset.name}`,
        subtitle: clean(preset.description) ?? clean(preset.useCase),
        includes: null,
        condition: "NEW",
        price,
        priceFrom: true,
        image: null,
        warrantyNote: null,
        availability: "PREORDER",
        waText: waText(`paket PC rakitan ${preset.name}`, price, "Boleh minta rincian komponen dan estimasi pengerjaannya?")
      });
    }

    // Komponen satuan dari data Rakit PC (harga jual sudah ada). Yang tertaut ke Inventori dianggap ready.
    for (const component of components) {
      if (component.salePrice <= 0) continue;
      const linked = component.inventoryItemId !== null;
      const label = COMPONENT_LABEL[component.category] ?? component.category;
      const row: PcCatalogItem = {
        key: `cmp-${component.id}`,
        kindLabel: label,
        name: component.name,
        subtitle: clean(component.specification) ?? clean(component.brand),
        includes: null,
        condition: component.inventoryItem?.condition ?? null,
        price: component.salePrice,
        image: clean(component.inventoryItem?.catalogImageUrl),
        warrantyNote: clean(component.inventoryItem?.catalogWarrantyNote),
        availability: linked ? "READY" : "PREORDER",
        waText: waText(`${label.toLowerCase()} ${component.name}`, component.salePrice, linked ? undefined : "Apakah bisa dipesan, dan berapa lama estimasinya?")
      };
      if (component.category === "MONITOR") monitors.push(row);
      else if (component.category === "ACCESSORY") accessories.push(row);
      else parts.push(row);
    }

    return { connected: true, sets, monitors, parts, accessories };
  } catch {
    return { connected: false, sets: [], monitors: [], parts: [], accessories: [] };
  }
}
