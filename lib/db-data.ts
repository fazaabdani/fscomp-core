import type { Prisma } from "@prisma/client";
import { batches as demoBatches, dailyQcs as demoDailyQcs, units as demoUnits, type BatchPSI } from "./api";
import { prisma } from "./prisma";

const paymentStatusLabel: Record<string, BatchPSI["statusPembayaran"]> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

function processorGeneration(processor: string) {
  const normalized = processor.toLowerCase();
  const genMatch = normalized.match(/gen\s*(\d+)/);
  if (genMatch) return Number(genMatch[1]);
  const intelCodeMatch = normalized.match(/\b[ui][3579][- ]?(\d{4,5})/);
  if (intelCodeMatch) {
    const code = intelCodeMatch[1];
    return code.length === 5 ? Number(code.slice(0, 2)) : Number(code.slice(0, 1));
  }
  return 0;
}

function requiresWindows11(processor: string) {
  return processorGeneration(processor) >= 8;
}

function hasWindows11Daily(qcHarian: { windowsVersion?: string | null }[]) {
  const latestDaily = qcHarian[0];
  return Boolean(latestDaily?.windowsVersion?.toLowerCase().includes("windows 11"));
}

export async function getBatchesForPage() {
  try {
    const dbBatches = await prisma.batchPSI.findMany({
      include: { units: true },
      orderBy: { tanggalMasuk: "desc" }
    });

    if (dbBatches.length === 0) {
      return demoBatches.map((batch) => ({
        ...batch,
        units: demoUnits.filter((unit) => unit.batchId === batch.id)
      }));
    }

    return dbBatches.map((batch) => ({
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran],
      catatan: batch.catatan ?? "",
      units: batch.units.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        hargaJualRekomendasi: unit.hargaJualRekomendasi,
        ssdSerial: unit.ssdSerial ?? "",
        lcdSize: unit.lcdSize ?? "",
        lcdResolution: unit.lcdResolution ?? "",
        isTouchscreen: unit.isTouchscreen,
        ssdHealth: unit.ssdHealth ?? 0,
        batteryHealth: unit.batteryHealth ?? 0,
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      }))
    }));
  } catch {
    return demoBatches.map((batch) => ({
      ...batch,
      units: demoUnits.filter((unit) => unit.batchId === batch.id)
    }));
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
      lcdSize: unit.lcdSize ?? "",
      lcdResolution: unit.lcdResolution ?? "",
      isTouchscreen: unit.isTouchscreen,
      hargaModal: unit.hargaModal,
      hargaJualRekomendasi: unit.hargaJualRekomendasi,
      batteryHealth: unit.batteryHealth ?? 0,
      ssdHealth: unit.ssdHealth ?? 0,
      statusObservasi: unit.statusObservasi
    };
  } catch {
    const unit = demoUnits.find((item) => item.id === id);
    if (!unit) return null;
    return {
      ...unit,
      batchName: demoBatches.find((batch) => batch.id === unit.batchId)?.nomorBatch ?? "-"
    };
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
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran],
      catatan: batch.catatan ?? ""
    };
  } catch {
    return demoBatches.find((batch) => batch.id === id) ?? null;
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
          select: {
            id: true,
            tanggal: true,
            ssdHealth: true,
            batteryHealth: true,
            windowsVersion: true,
            kondisiHariIni: true,
            masihLolos: true,
            catatan: true,
            checker: { select: { name: true } }
          }
        }
      }
    });

    if (!unit) return null;

    return {
      id: unit.id,
      nomorUnit: unit.nomorUnit,
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
      hargaModal: unit.hargaModal,
      hargaJualRekomendasi: unit.hargaJualRekomendasi,
      batteryHealth: unit.batteryHealth ?? 0,
      ssdHealth: unit.ssdHealth ?? 0,
      statusObservasi: unit.statusObservasi.replaceAll("_", " "),
      tanggalMasuk: unit.tanggalMasuk.toISOString().slice(0, 10),
      tempo: unit.tempo?.toISOString().slice(0, 10) ?? "-",
      batch: {
        nomorBatch: unit.batch.nomorBatch
      },
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
        windowsVersion: qc.windowsVersion,
        kondisiHariIni: qc.kondisiHariIni,
        masihLolos: qc.masihLolos.replaceAll("_", " "),
        catatan: qc.catatan ?? "-"
      }))
    };
  } catch {
    const demoUnit = demoUnits.find((unit) => unit.id === id);
    if (!demoUnit) return null;

    return {
      ...demoUnit,
      batch: { nomorBatch: demoBatches.find((batch) => batch.id === demoUnit.batchId)?.nomorBatch ?? "-" },
      dailyHistory: []
    };
  }
}

export async function getUnitsForLabel() {
  try {
    const dbUnits = await prisma.unit.findMany({
      include: { qcAwal: { include: { checker: true } } },
      orderBy: { createdAt: "desc" }
    });

    if (dbUnits.length === 0) return demoUnits;

    return dbUnits.map((unit) => ({
      id: unit.id,
      nomorUnit: unit.nomorUnit,
      model: unit.model,
      processor: unit.processor,
      ram: unit.ram,
      ssd: unit.ssd,
      hargaJualRekomendasi: unit.hargaJualRekomendasi,
      statusObservasi: unit.statusObservasi.replaceAll("_", " "),
      qcAwal: {
        tanggal: unit.qcAwal?.tanggal.toISOString().slice(0, 10) ?? "-",
        checker: unit.qcAwal?.checker.name ?? "-",
        hardware: unit.qcAwal
          ? {
              Body: unit.qcAwal.body,
              "Body Broken": unit.qcAwal.bodyBroken,
              "Karet Bawah": unit.qcAwal.karetBawah,
              Repaint: unit.qcAwal.repaint,
              Layar: unit.qcAwal.layar,
              Touchscreen: unit.qcAwal.touchscreen,
              Keyboard: unit.qcAwal.keyboard,
              Touchpad: unit.qcAwal.touchpad,
              Trackpoint: unit.qcAwal.trackpoint,
              USB: unit.qcAwal.usb,
              Kamera: unit.qcAwal.kamera,
              Speaker: unit.qcAwal.speaker,
              Mic: unit.qcAwal.mic,
              Battery: unit.qcAwal.battery,
              SSD: unit.qcAwal.ssd
            }
          : {},
        software: unit.qcAwal
          ? {
              OS: unit.qcAwal.osInstalled,
              "Update OS": unit.qcAwal.updateOs,
              Driver: unit.qcAwal.driver,
              "Security Patch": unit.qcAwal.securityPatch,
              Aplikasi: unit.qcAwal.aplikasiDefault
            }
          : {}
      }
    }));
  } catch {
    return demoUnits;
  }
}

export async function getQcHarianPageData() {
  try {
    const dbUnits = await prisma.unit.findMany({
      orderBy: [{ nomorUnit: "asc" }],
      select: {
        id: true,
        nomorUnit: true,
        model: true,
        processor: true,
        ram: true,
        ssd: true,
        ssdHealth: true,
        batteryHealth: true
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
        windowsVersion: true,
        kondisiHariIni: true,
        masihLolos: true,
        catatan: true,
        unit: { select: { id: true, nomorUnit: true, model: true } }
      },
      orderBy: { tanggal: "desc" },
      take: 20
    });

    if (dbUnits.length === 0) {
      return {
        units: demoUnits.map((unit) => ({
          id: unit.id,
          nomorUnit: unit.nomorUnit,
          model: unit.model,
          processor: unit.processor,
          ram: unit.ram,
          ssd: unit.ssd,
          ssdHealth: unit.ssdHealth,
          batteryHealth: unit.batteryHealth
        })),
        dailyQcs: demoDailyQcs.map((qc) => ({
          ...qc,
          unit: demoUnits.find((unit) => unit.id === qc.unitId)
        }))
      };
    }

    return {
      units: dbUnits,
      dailyQcs: dbDailyQcs.map((qc) => ({
        id: qc.id,
        unitId: qc.unitId,
        tanggal: qc.tanggal.toISOString().slice(0, 10),
        checker: qc.checker.name,
        ssdHealth: qc.ssdHealth,
        batteryHealth: qc.batteryHealth,
        windowsVersion: qc.windowsVersion,
        kondisiHariIni: qc.kondisiHariIni,
        masihLolos: qc.masihLolos.replaceAll("_", " "),
        catatan: qc.catatan ?? "",
        unit: {
          id: qc.unit.id,
          nomorUnit: qc.unit.nomorUnit,
          model: qc.unit.model
        }
      }))
    };
  } catch {
    return {
      units: demoUnits.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        ssdHealth: unit.ssdHealth,
        batteryHealth: unit.batteryHealth
      })),
      dailyQcs: demoDailyQcs.map((qc) => ({
        ...qc,
        unit: demoUnits.find((unit) => unit.id === qc.unitId)
      }))
    };
  }
}

export async function getDashboardData() {
  try {
    const [
      batches,
      units,
      totalUnitCount,
      dailyQcCount,
      aiLogs
    ] = await Promise.all([
      prisma.batchPSI.findMany({
        include: { units: true },
        orderBy: { tanggalMasuk: "desc" },
        take: 6
      }),
      prisma.unit.findMany({
        include: {
          qcHarian: {
            orderBy: { tanggal: "desc" },
            take: 1,
            select: { masihLolos: true, windowsVersion: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }),
      prisma.unit.count(),
      prisma.qcHarian.count(),
      prisma.aiLog.findMany({
        include: { unit: true },
        orderBy: { tanggal: "desc" },
        take: 5
      })
    ]);

    const isDailyProblem = (unit: { qcHarian: { masihLolos: string }[] }) => {
      const latestDaily = unit.qcHarian[0];
      return Boolean(latestDaily && latestDaily.masihLolos !== "LOLOS");
    };
    const isReadyForCatalog = (unit: { statusObservasi: string; soldAt: Date | null; processor: string; qcHarian: { masihLolos: string; windowsVersion?: string | null }[] }) =>
      !unit.soldAt &&
      (unit.statusObservasi === "VERIFIED" || unit.statusObservasi === "VERIFIED_WITH_NOTES") &&
      !isDailyProblem(unit) &&
      (!requiresWindows11(unit.processor) || hasWindows11Daily(unit.qcHarian));

    const problemUnits = units
      .filter((unit) => unit.statusObservasi === "RECHECK" || unit.statusObservasi === "CANDIDATE_RETUR" || isDailyProblem(unit) || (requiresWindows11(unit.processor) && !hasWindows11Daily(unit.qcHarian)))
      .slice(0, 6)
      .map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        statusObservasi: requiresWindows11(unit.processor) && !hasWindows11Daily(unit.qcHarian) ? "BUTUH WINDOWS 11" : unit.statusObservasi.replaceAll("_", " ")
      }));

    const catalogReadyUnits = units
      .filter(isReadyForCatalog)
      .slice(0, 8)
      .map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
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
        unitNomor: log.unit.nomorUnit,
        rekomendasi: log.rekomendasi
      })),
      batches: batches.map((batch) => ({
        id: batch.id,
        nomorBatch: batch.nomorBatch,
        supplier: batch.supplier,
        tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
        statusPembayaran: paymentStatusLabel[batch.statusPembayaran],
        catatan: batch.catatan ?? "",
        jumlahUnit: batch.units.length
      })),
      catalogReadyUnits
    };
  } catch {
    return {
      connected: false,
      stats: {
        unitAktif: 0,
        siapKatalog: 0,
        perluPerhatian: 0,
        qcHarian: 0
      },
      problemUnits: [],
      aiLogs: [],
      batches: [],
      catalogReadyUnits: []
    };
  }
}

export async function getBatchPaymentSummary(batchId: string) {
  try {
    const batch = await prisma.batchPSI.findUnique({
      where: { id: batchId },
      include: {
        units: {
          orderBy: { nomorUnit: "asc" }
        }
      }
    });

    if (!batch) return null;

    const normalUnits = batch.units.filter((unit) => unit.statusObservasi === "VERIFIED" || unit.statusObservasi === "VERIFIED_WITH_NOTES");
    const problemUnits = batch.units.filter((unit) => unit.statusObservasi === "RECHECK" || unit.statusObservasi === "CANDIDATE_RETUR");
    const totalModal = batch.units.reduce((sum, unit) => sum + unit.hargaModal, 0);
    const totalNormal = normalUnits.reduce((sum, unit) => sum + unit.hargaModal, 0);
    const totalProblem = problemUnits.reduce((sum, unit) => sum + unit.hargaModal, 0);

    return {
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran],
      catatan: batch.catatan ?? "",
      totalModal,
      totalNormal,
      totalProblem,
      netTransfer: totalNormal,
      normalUnits: normalUnits.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        hargaModal: unit.hargaModal,
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      })),
      problemUnits: problemUnits.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        hargaModal: unit.hargaModal,
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      }))
    };
  } catch {
    return null;
  }
}

export async function getSalesPageData() {
  try {
    const readyCandidates = await prisma.unit.findMany({
      where: {
        soldAt: null,
        statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] }
      },
      include: {
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          select: { masihLolos: true, windowsVersion: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 80
    });

    const readyUnits = readyCandidates.filter((unit) => {
      const latestDaily = unit.qcHarian[0];
      const dailyReady = !latestDaily || latestDaily.masihLolos === "LOLOS";
      const osReady = !requiresWindows11(unit.processor) || hasWindows11Daily(unit.qcHarian);
      return dailyReady && osReady;
    });

    let sales: Array<Prisma.SaleGetPayload<{ include: { unit: true; items: true } }>> = [];
    let salesReady = true;

    try {
      sales = await prisma.sale.findMany({
        include: { unit: true, items: true },
        orderBy: { soldAt: "desc" },
        take: 40
      });
    } catch {
      salesReady = false;
    }

    const blockedByDailyQc = readyCandidates.length - readyUnits.length;
    const activeSales = sales.filter((sale) => !sale.voidedAt);
    const totalOmzet = activeSales.reduce((sum, sale) => sum + sale.soldPrice, 0);
    const totalProfit = activeSales.reduce((sum, sale) => sum + sale.grossProfit, 0);

    return {
      readyUnits: readyUnits.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        hargaJualRekomendasi: unit.hargaJualRekomendasi,
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      })),
      sales: sales.map((sale) => ({
        id: sale.id,
        unitId: sale.unitId,
        nomorUnit: sale.unit.nomorUnit,
        model: sale.unit.model,
        invoiceNumber: sale.invoiceNumber,
        location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
        soldPrice: sale.soldPrice,
        costPrice: sale.costPrice,
        grossProfit: sale.grossProfit,
        paymentMethod: sale.paymentMethod,
        buyerName: sale.buyerName ?? "-",
        itemCount: sale.items.reduce((sum, item) => sum + item.qty, 0),
        soldAt: sale.soldAt.toISOString().slice(0, 10),
        voidedAt: sale.voidedAt?.toISOString().slice(0, 10) ?? "",
        voidReason: sale.voidReason ?? "",
        notes: sale.notes ?? ""
      })),
      stats: {
        totalOmzet,
        totalProfit,
        readyCount: readyUnits.length,
        soldCount: activeSales.length
      },
      salesReady,
      blockedByDailyQc
    };
  } catch {
    return {
      readyUnits: [],
      sales: [],
      stats: {
        totalOmzet: 0,
        totalProfit: 0,
        readyCount: 0,
        soldCount: 0
      },
      salesReady: false,
      blockedByDailyQc: 0
    };
  }
}

export async function getSaleReceipt(id: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        unit: true,
        items: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!sale) return null;

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      soldAt: sale.soldAt.toISOString().slice(0, 10),
      location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
      paymentMethod: sale.paymentMethod,
      buyerName: sale.buyerName ?? "-",
      buyerPhone: sale.buyerPhone ?? "-",
      warrantySoftware: sale.warrantySoftware,
      warrantyHardware: sale.warrantyHardware,
      subtotal: sale.subtotal,
      costPrice: sale.costPrice,
      grossProfit: sale.grossProfit,
      voidedAt: sale.voidedAt?.toISOString().slice(0, 10) ?? "",
      voidReason: sale.voidReason ?? "",
      notes: sale.notes ?? "-",
      unit: {
        nomorUnit: sale.unit.nomorUnit,
        model: sale.unit.model,
        processor: sale.unit.processor,
        ram: sale.unit.ram,
        ssd: sale.unit.ssd
      },
      items: sale.items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      }))
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
        unitNomor: sale.unit.nomorUnit,
        model: sale.unit.model,
        soldPrice: sale.soldPrice,
        costPrice: sale.costPrice,
        grossProfit: sale.grossProfit,
        itemCount: sale.items.reduce((sum, item) => sum + item.qty, 0),
        paymentMethod: sale.paymentMethod
      }))
    };
  } catch {
    return {
      stats: {
        totalOmzet: 0,
        totalModal: 0,
        totalProfit: 0,
        totalTransaksi: 0
      },
      sales: []
    };
  }
}
