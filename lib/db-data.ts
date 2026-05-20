import { batches as demoBatches, dailyQcs as demoDailyQcs, units as demoUnits, type BatchPSI } from "./api";
import { prisma } from "./prisma";

const paymentStatusLabel: Record<string, BatchPSI["statusPembayaran"]> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

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
        qcHarian: { include: { checker: true }, orderBy: { tanggal: "desc" } }
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
      include: { unit: true, checker: true },
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
      catalogReadyCount,
      problemUnitCount,
      dailyQcCount,
      aiLogs
    ] = await Promise.all([
      prisma.batchPSI.findMany({
        include: { units: true },
        orderBy: { tanggalMasuk: "desc" },
        take: 6
      }),
      prisma.unit.findMany({
        orderBy: { createdAt: "desc" },
        take: 30
      }),
      prisma.unit.count(),
      prisma.unit.count({
        where: { statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] } }
      }),
      prisma.unit.count({
        where: { statusObservasi: { in: ["RECHECK", "CANDIDATE_RETUR"] } }
      }),
      prisma.qcHarian.count(),
      prisma.aiLog.findMany({
        include: { unit: true },
        orderBy: { tanggal: "desc" },
        take: 5
      })
    ]);

    const problemUnits = units
      .filter((unit) => unit.statusObservasi === "RECHECK" || unit.statusObservasi === "CANDIDATE_RETUR")
      .slice(0, 6)
      .map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      }));

    const catalogReadyUnits = units
      .filter((unit) => unit.statusObservasi === "VERIFIED" || unit.statusObservasi === "VERIFIED_WITH_NOTES")
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
        siapKatalog: catalogReadyCount,
        perluPerhatian: problemUnitCount,
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
