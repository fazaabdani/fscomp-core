import type { Prisma } from "@prisma/client";
import { chargerTypes } from "./charger-options";
import { mediaAssetUrl, mediaThumbUrl } from "./media-data";
import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";
export { getBatchPaymentSummary } from "./batch-payment-data";
export { getCatalogPageData } from "./catalog-page-data";
export { getSaleReceipt } from "./sale-receipt-data";
export { getSalesPageData } from "./sales-page-data";
export { getUnitsForLabel } from "./label-data";

const paymentStatusLabel: Record<string, string> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

function chargerCountsFromJson(value: unknown) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(chargerTypes.map((type) => [type, Number(raw[type] ?? 0) || 0]));
}

function hasSaleReadyDaily(qcHarian: { masihLolos: string; tanggal?: Date | null }[]) {
  const latestDaily = qcHarian[0];
  return Boolean(latestDaily && latestDaily.masihLolos !== "TIDAK_LOLOS");
}

export async function getBatchesForPage() {
  try {
    const batches = await prisma.batchPSI.findMany({
      include: { units: true },
      orderBy: { tanggalMasuk: "desc" }
    });

    return batches.map((batch) => ({
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran] ?? batch.statusPembayaran,
      catatan: batch.catatan ?? "",
      units: batch.units.map((unit) => ({
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        hargaJualRekomendasi: unit.hargaJualRekomendasi,
        stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
        ssdSerial: unit.ssdSerial ?? "",
        lcdSize: unit.lcdSize ?? "",
        lcdResolution: unit.lcdResolution ?? "",
        isTouchscreen: unit.isTouchscreen,
        ssdHealth: unit.ssdHealth ?? 0,
        batteryHealth: unit.batteryHealth ?? 0,
        statusObservasi: unit.statusObservasi.replaceAll("_", " "),
        soldAt: unit.soldAt?.toISOString().slice(0, 10) ?? ""
      }))
    }));
  } catch {
    return [];
  }
}

export async function getUnitForEdit(id: string) {
  try {
    const unit = await prisma.unit.findUnique({ where: { id }, include: { batch: true } });
    if (!unit) return null;

    return {
      id: unit.id,
      nomorUnit: unit.nomorUnit,
      batchId: unit.batchId,
      batchName: unit.batch.nomorBatch,
      model: unit.model,
      processor: unit.processor,
      ram: unit.ram,
      ssd: unit.ssd,
      ssdSerial: unit.ssdSerial ?? "",
      chargerType: unit.chargerType ?? "",
      lcdSize: unit.lcdSize ?? "",
      lcdResolution: unit.lcdResolution ?? "",
      isTouchscreen: unit.isTouchscreen,
      entryNotes: unit.entryNotes ?? "-",
      hargaModal: unit.hargaModal,
      hargaJualRekomendasi: unit.hargaJualRekomendasi,
      stockLocation: unit.stockLocation,
      catalogImageUrl: unit.catalogImageUrl ?? "",
      batteryHealth: unit.batteryHealth ?? 0,
      ssdHealth: unit.ssdHealth ?? 0,
      statusObservasi: unit.statusObservasi
    };
  } catch {
    return null;
  }
}

export async function getBatchForEdit(id: string) {
  try {
    const batch = await prisma.batchPSI.findUnique({ where: { id } });
    if (!batch) return null;

    return {
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      jumlahLaptopDatang: batch.jumlahLaptopDatang ?? "",
      jumlahChargerDatang: batch.jumlahChargerDatang ?? "",
      chargerCounts: chargerCountsFromJson(batch.chargerCounts),
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran] ?? batch.statusPembayaran,
      catatan: batch.catatan ?? ""
    };
  } catch {
    return null;
  }
}

export async function getUnitForDetail(id: string) {
  try {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        batch: true,
        qcAwal: { include: { checker: true } },
        qcHarian: {
          orderBy: { tanggal: "desc" },
          include: { checker: true }
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20
        },
        unitPhotos: { orderBy: { order: "asc" }, include: { asset: { select: { fileName: true } } } }
      }
    });

    if (!unit) return null;

    const gallery = unit.unitPhotos.map((photo) => ({
      url: mediaAssetUrl(photo.asset.fileName),
      thumbUrl: mediaThumbUrl(photo.asset.fileName)
    }));

    return {
      id: unit.id,
      nomorUnit: displayUnitNumber(unit.nomorUnit),
      batchId: unit.batchId,
      supplier: unit.supplier,
      model: unit.model,
      processor: unit.processor,
      ram: unit.ram,
      ssd: unit.ssd,
      ssdSerial: unit.ssdSerial ?? "-",
      lcdSize: unit.lcdSize ?? "-",
      lcdResolution: unit.lcdResolution ?? "-",
      isTouchscreen: unit.isTouchscreen,
      entryNotes: unit.entryNotes ?? "-",
      hargaModal: unit.hargaModal,
      hargaJualRekomendasi: unit.hargaJualRekomendasi,
      stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
      catalogImageUrl: gallery[0]?.url ?? unit.catalogImageUrl ?? "",
      gallery,
      batteryHealth: unit.batteryHealth ?? 0,
      ssdHealth: unit.ssdHealth ?? 0,
      statusObservasi: unit.statusObservasi.replaceAll("_", " "),
      updatedAt: unit.updatedAt.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
      tanggalMasuk: unit.tanggalMasuk.toISOString().slice(0, 10),
      tempo: unit.tempo?.toISOString().slice(0, 10) ?? "-",
      batch: { nomorBatch: unit.batch.nomorBatch },
      qcAwal: unit.qcAwal
        ? {
            checker: unit.qcAwal.checker.name,
            tanggal: unit.qcAwal.tanggal.toISOString().slice(0, 10),
            hardware: {
              Body: unit.qcAwal.body,
              "Body Broken": unit.qcAwal.bodyBroken,
              "Karet Bawah": unit.qcAwal.karetBawah,
              Repaint: unit.qcAwal.repaint,
              Layar: unit.qcAwal.layar,
              "Ukuran LCD": unit.qcAwal.ukuranLcd,
              "Resolusi Layar": unit.qcAwal.resolusiLayar,
              Touchscreen: unit.qcAwal.touchscreen,
              Keyboard: unit.qcAwal.keyboard,
              Touchpad: unit.qcAwal.touchpad,
              Trackpoint: unit.qcAwal.trackpoint,
              USB: unit.qcAwal.usb,
              Kamera: unit.qcAwal.kamera,
              Port: unit.qcAwal.port,
              Speaker: unit.qcAwal.speaker,
              Mic: unit.qcAwal.mic,
              Charger: unit.qcAwal.charger,
              Battery: unit.qcAwal.battery,
              SSD: unit.qcAwal.ssd,
              "Seri SSD": unit.qcAwal.seriSsd
            },
            software: {
              OS: unit.qcAwal.osInstalled,
              Windows: unit.qcAwal.windowsVersion,
              "Update OS": unit.qcAwal.updateOs,
              Driver: unit.qcAwal.driver,
              "Security Patch": unit.qcAwal.securityPatch,
              "Aplikasi Default": unit.qcAwal.aplikasiDefault
            },
            reminder: unit.qcAwal.reminder,
            catatan: unit.qcAwal.catatan ?? "-"
          }
        : null,
      dailyHistory: unit.qcHarian.map((qc) => ({
        id: qc.id,
        tanggal: qc.tanggal.toISOString().slice(0, 10),
        checker: qc.checker.name,
        ssdHealth: qc.ssdHealth,
        batteryHealth: qc.batteryHealth,
        ssdSerial: qc.ssdSerial ?? "-",
        screenCondition: qc.screenCondition,
        windowsVersion: qc.windowsVersion,
        driverStatus: qc.driverStatus,
        clockStatus: qc.clockStatus,
        appStatus: qc.appStatus,
        officeStatus: qc.officeStatus,
        partitionCount: qc.partitionCount,
        keyboard: qc.keyboard,
        wifi: qc.wifi,
        usb: qc.usb,
        camera: qc.camera,
        touchpad: qc.touchpad,
        trackpoint: qc.trackpoint,
        bluetooth: qc.bluetooth,
        speaker: qc.speaker,
        mic: qc.mic,
        bodyBroken: qc.bodyBroken,
        karetBawah: qc.karetBawah,
        paintCondition: qc.paintCondition ?? "-",
        kondisiHariIni: qc.kondisiHariIni,
        masihLolos: qc.masihLolos.replaceAll("_", " "),
        catatan: qc.catatan ?? "-"
      })),
      auditLogs: unit.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorName: log.actorName,
        actorUsername: log.actorUsername ?? "",
        actorRole: log.actorRole ?? "",
        changes: Array.isArray(log.changes) ? log.changes as { field: string; before: unknown; after: unknown }[] : [],
        createdAt: log.createdAt.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      }))
    };
  } catch {
    return null;
  }
}

export async function getQcHarianPageData() {
  try {
    const dbUnits = await prisma.unit.findMany({
      where: {
        soldAt: null,
        statusObservasi: { not: "RETUR_DISTRIBUTOR" }
      },
      orderBy: [{ nomorUnit: "asc" }],
      select: {
        id: true,
        nomorUnit: true,
        model: true,
        processor: true,
        ram: true,
        ssd: true,
        ssdSerial: true,
        ssdHealth: true,
        batteryHealth: true,
        stockLocation: true
      }
    });

    const dbDailyQcs = await prisma.qcHarian.findMany({
      select: {
        id: true,
        unitId: true,
        tanggal: true,
        checker: { select: { name: true } },
        ssdHealth: true,
        batteryHealth: true,
        ssdSerial: true,
        screenCondition: true,
        windowsVersion: true,
        driverStatus: true,
        clockStatus: true,
        appStatus: true,
        officeStatus: true,
        partitionCount: true,
        kondisiHariIni: true,
        masihLolos: true,
        catatan: true,
        unit: { select: { id: true, nomorUnit: true, model: true } }
      },
      orderBy: { tanggal: "desc" },
      take: 20
    });

    return {
      units: dbUnits,
      dailyQcs: dbDailyQcs.map((qc) => ({
        id: qc.id,
        unitId: qc.unitId,
        tanggal: qc.tanggal.toISOString().slice(0, 10),
        checker: qc.checker.name,
        ssdHealth: qc.ssdHealth,
        batteryHealth: qc.batteryHealth,
        ssdSerial: qc.ssdSerial ?? "",
        screenCondition: qc.screenCondition,
        windowsVersion: qc.windowsVersion,
        driverStatus: qc.driverStatus,
        clockStatus: qc.clockStatus,
        appStatus: qc.appStatus,
        officeStatus: qc.officeStatus,
        partitionCount: qc.partitionCount,
        kondisiHariIni: qc.kondisiHariIni,
        masihLolos: qc.masihLolos.replaceAll("_", " "),
        catatan: qc.catatan ?? "",
        unit: {
          id: qc.unit.id,
          nomorUnit: displayUnitNumber(qc.unit.nomorUnit),
          model: qc.unit.model
        }
      }))
    };
  } catch {
    return { units: [], dailyQcs: [] };
  }
}

export async function getDashboardData() {
  try {
    const todayJakarta = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const todayStart = new Date(`${todayJakarta}T00:00:00+07:00`);
    const todayEnd = new Date(`${todayJakarta}T23:59:59.999+07:00`);

    const [batches, units, totalUnitCount, dailyQcCount, aiLogs] = await Promise.all([
      prisma.batchPSI.findMany({ include: { units: true }, orderBy: { tanggalMasuk: "desc" }, take: 6 }),
      prisma.unit.findMany({
        include: {
          qcHarian: {
            orderBy: { tanggal: "desc" },
            take: 1,
            select: { tanggal: true, masihLolos: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }),
      prisma.unit.count(),
      prisma.qcHarian.count({ where: { tanggal: { gte: todayStart, lte: todayEnd } } }),
      prisma.aiLog.findMany({
        where: { status: "OPEN" },
        include: { unit: true },
        orderBy: { tanggal: "desc" },
        take: 8
      })
    ]);

    const isDailyProblem = (unit: { qcHarian: { masihLolos: string }[] }) => unit.qcHarian[0]?.masihLolos === "TIDAK_LOLOS";
    const isReadyForCatalog = (unit: { statusObservasi: string; soldAt: Date | null; qcHarian: { masihLolos: string; tanggal?: Date | null }[] }) =>
      !unit.soldAt &&
      (unit.statusObservasi === "VERIFIED" || unit.statusObservasi === "VERIFIED_WITH_NOTES") &&
      hasSaleReadyDaily(unit.qcHarian) &&
      !isDailyProblem(unit);

    const problemUnits = units
      .filter((unit) => ["RECHECK", "CANDIDATE_RETUR", "RETUR_DISTRIBUTOR"].includes(unit.statusObservasi) || isDailyProblem(unit))
      .slice(0, 6)
      .map((unit) => ({
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      }));

    const catalogReadyUnits = units.filter(isReadyForCatalog).slice(0, 8).map((unit) => ({
      id: unit.id,
      nomorUnit: displayUnitNumber(unit.nomorUnit),
      model: unit.model,
      processor: unit.processor,
      ram: unit.ram,
      ssd: unit.ssd,
      hargaJualRekomendasi: unit.hargaJualRekomendasi
    }));

    return {
      connected: true,
      stats: {
        unitAktif: totalUnitCount,
        siapKatalog: catalogReadyUnits.length,
        perluPerhatian: problemUnits.length,
        qcHarian: dailyQcCount
      },
      problemUnits,
      aiLogs: aiLogs.map((log) => ({
        id: log.id,
        unitNomor: displayUnitNumber(log.unit.nomorUnit),
        rekomendasi: log.rekomendasi
      })),
      batches: batches.map((batch) => ({
        id: batch.id,
        nomorBatch: batch.nomorBatch,
        supplier: batch.supplier,
        tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
        statusPembayaran: paymentStatusLabel[batch.statusPembayaran] ?? batch.statusPembayaran,
        catatan: batch.catatan ?? "",
        jumlahUnit: batch.units.length
      })),
      catalogReadyUnits
    };
  } catch {
    return {
      connected: false,
      stats: { unitAktif: 0, siapKatalog: 0, perluPerhatian: 0, qcHarian: 0 },
      problemUnits: [],
      aiLogs: [],
      batches: [],
      catalogReadyUnits: []
    };
  }
}

export async function getBatchHistoryData(batchId: string) {
  try {
    const batch = await prisma.batchPSI.findUnique({
      where: { id: batchId },
      include: {
        units: {
          orderBy: { nomorUnit: "asc" },
          include: {
            qcHarian: {
              orderBy: { tanggal: "desc" },
              select: {
                id: true,
                tanggal: true,
                checker: { select: { name: true } },
                ssdHealth: true,
                batteryHealth: true,
                ssdSerial: true,
                screenCondition: true,
                windowsVersion: true,
                driverStatus: true,
                officeStatus: true,
                partitionCount: true,
                kondisiHariIni: true,
                masihLolos: true,
                catatan: true
              }
            }
          }
        }
      }
    });

    if (!batch) return null;

    return {
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      histories: batch.units.flatMap((unit) =>
        unit.qcHarian.map((qc) => ({
          id: qc.id,
          unitId: unit.id,
          nomorUnit: displayUnitNumber(unit.nomorUnit),
          model: unit.model,
          tanggal: qc.tanggal.toISOString().slice(0, 10),
          checker: qc.checker.name,
          ssdHealth: qc.ssdHealth,
          batteryHealth: qc.batteryHealth,
          ssdSerial: qc.ssdSerial ?? "",
          screenCondition: qc.screenCondition,
          windowsVersion: qc.windowsVersion,
          driverStatus: qc.driverStatus,
          officeStatus: qc.officeStatus,
          partitionCount: qc.partitionCount,
          kondisiHariIni: qc.kondisiHariIni,
          masihLolos: qc.masihLolos.replaceAll("_", " "),
          catatan: qc.catatan ?? ""
        }))
      )
    };
  } catch {
    return null;
  }
}

export async function getFinancePageData() {
  try {
    const sales = await prisma.sale.findMany({
      where: { voidedAt: null },
      include: { unit: true, items: true },
      orderBy: { soldAt: "desc" },
      take: 120
    });

    const totalOmzet = sales.reduce((sum, sale) => sum + sale.soldPrice, 0);
    const totalModal = sales.reduce((sum, sale) => sum + sale.costPrice, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.grossProfit, 0);

    return {
      stats: {
        totalOmzet,
        totalModal,
        totalProfit,
        totalTransaksi: sales.length
      },
      sales: sales.map((sale) => ({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        soldAt: sale.soldAt.toISOString().slice(0, 10),
        location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
        unitNomor: sale.unit ? displayUnitNumber(sale.unit.nomorUnit) : "-",
        model: sale.unit?.model ?? "Lisensi / software",
        soldPrice: sale.soldPrice,
        costPrice: sale.costPrice,
        grossProfit: sale.grossProfit,
        itemCount: sale.items.reduce((sum, item) => sum + item.qty, 0),
        paymentMethod: sale.paymentMethod
      }))
    };
  } catch {
    return {
      stats: { totalOmzet: 0, totalModal: 0, totalProfit: 0, totalTransaksi: 0 },
      sales: []
    };
  }
}
