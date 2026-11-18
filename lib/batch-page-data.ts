import type { BatchPSI } from "./api";
import { chargerTypes } from "./charger-options";
import { resolvePrimaryImageUrl } from "./media-data";
import { inventoryStatusLabel } from "./inventory";
import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

const paymentStatusLabel: Record<string, BatchPSI["statusPembayaran"]> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

const NON_LAPTOP_LABEL: Record<string, string> = {
  PC_SET: "PC set", PC_ONLY: "PC only", AIO: "All-in-one", MONITOR: "Monitor", ACCESSORY: "Aksesoris", COMPONENT: "Komponen", AKSESORIS: "Aksesoris"
};
function nonLaptopLabel(value: string) {
  return NON_LAPTOP_LABEL[value] ?? value;
}

function chargerCounts(value: unknown) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(chargerTypes.map((type) => [type, Number(raw[type] ?? 0) || 0]));
}

type BatchForManagement = {
  id: string;
  nomorBatch: string;
  supplier: string;
  tanggalMasuk: string;
  tanggalTempo: string;
  jumlahLaptopDatang: number;
  jumlahChargerDatang: number;
  chargerCounts: Record<string, number>;
  statusPembayaran: BatchPSI["statusPembayaran"];
  catatan: string;
  nonLaptop: {
    id: string;
    name: string;
    kindLabel: string;
    spec: string;
    costPrice: number;
    status: string;
    condition: string;
  }[];
  units: {
    id: string;
    nomorUnit: string;
    model: string;
    processor: string;
    ram: string;
    ssd: string;
    chargerType: string;
    hargaModal: number;
    statusObservasi: string;
    catalogImageUrl: string;
    soldAt: string;
  }[];
};

export async function getBatchesForManagementPage(): Promise<{ connected: boolean; batches: BatchForManagement[] }> {
  try {
    const dbBatches = await prisma.batchPSI.findMany({
      include: {
        inventoryItems: { orderBy: { createdAt: "asc" } },
        units: {
          include: { unitPhotos: { orderBy: { order: "asc" }, take: 1, include: { asset: { select: { fileName: true } } } } }
        }
      },
      orderBy: { tanggalMasuk: "desc" }
    });

    return {
      connected: true,
      batches: dbBatches.map((batch) => ({
        id: batch.id,
        nomorBatch: batch.nomorBatch,
        supplier: batch.supplier,
        tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
        tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
        jumlahLaptopDatang: batch.jumlahLaptopDatang ?? batch.units.length,
        jumlahChargerDatang: batch.jumlahChargerDatang ?? 0,
        chargerCounts: chargerCounts(batch.chargerCounts),
        statusPembayaran: paymentStatusLabel[batch.statusPembayaran],
        catatan: batch.catatan ?? "",
        nonLaptop: batch.inventoryItems.map((item) => ({
          id: item.id,
          name: item.name,
          kindLabel: nonLaptopLabel(item.catalogKind ?? item.category),
          spec: item.specification ?? item.brandModel ?? "",
          costPrice: item.costPrice,
          status: inventoryStatusLabel(item.status),
          condition: item.condition === "NEW" ? "Baru" : "Second"
        })),
        units: batch.units.map((unit) => ({
          id: unit.id,
          nomorUnit: displayUnitNumber(unit.nomorUnit),
          model: unit.model,
          processor: unit.processor,
          ram: unit.ram,
          ssd: unit.ssd,
          chargerType: unit.chargerType ?? "",
          hargaModal: unit.hargaModal,
          statusObservasi: unit.statusObservasi.replaceAll("_", " "),
          catalogImageUrl: resolvePrimaryImageUrl(unit.unitPhotos, unit.catalogImageUrl),
          soldAt: unit.soldAt?.toISOString().slice(0, 10) ?? ""
        }))
      }))
    };
  } catch {
    return { connected: false, batches: [] };
  }
}
