import { units as demoUnits } from "./api";
import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

function qcResultFromBoolean(ok: boolean) {
  return ok ? "OK" : "FAIL";
}

function qcResultFromNote(ok: boolean) {
  return ok ? "OK" : "Tidak ada";
}

function qcResultFromText(value: string, okValue: string) {
  if (value === okValue) return "OK";
  return value || "-";
}

function problemFromBoolean(ok: boolean, problem: string) {
  return ok ? "OK" : problem;
}

export async function getUnitsForLabel() {
  try {
    const dbUnits = await prisma.unit.findMany({
      include: {
        qcAwal: { include: { checker: true } },
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          include: { checker: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    if (dbUnits.length === 0) return demoUnits;

    return dbUnits.map((unit) => {
      const latestDaily = unit.qcHarian[0];
      const ssdHealth = latestDaily?.ssdHealth ?? unit.ssdHealth ?? 0;
      const batteryHealth = latestDaily?.batteryHealth ?? unit.batteryHealth ?? 0;
      const statusObservasi = unit.statusObservasi.replaceAll("_", " ");
      const candidateReturNote = statusObservasi === "CANDIDATE RETUR"
        ? latestDaily?.catatan || latestDaily?.kondisiHariIni || unit.entryNotes || ""
        : "";
      const dailyHardware = latestDaily
        ? {
            Layar: qcResultFromText(latestDaily.screenCondition, "Normal"),
            Keyboard: qcResultFromBoolean(latestDaily.keyboard),
            ...(latestDaily.keyboardBacklight ? { Backlight: "OK" } : {}),
            USB: problemFromBoolean(latestDaily.usb, "Problem"),
            Kamera: problemFromBoolean(latestDaily.camera, "Problem"),
            Touchpad: problemFromBoolean(latestDaily.touchpad, "Problem"),
            Trackpoint: qcResultFromNote(latestDaily.trackpoint),
            Bluetooth: qcResultFromNote(latestDaily.bluetooth),
            Speaker: problemFromBoolean(latestDaily.speaker, "Problem"),
            Mic: problemFromBoolean(latestDaily.mic, "Problem"),
            "Body Broken": latestDaily.bodyBroken ? "Ya" : "OK",
            "Karet Bawah": latestDaily.karetBawah ? "OK" : "Tidak lengkap",
            Battery: `${batteryHealth}%`,
            SSD: `${ssdHealth}%`
          }
        : {};
      const dailySoftware = latestDaily
        ? {
            Windows: latestDaily.windowsVersion,
            Driver: qcResultFromText(latestDaily.driverStatus, "OK"),
            Jam: qcResultFromText(latestDaily.clockStatus, "Sesuai"),
            Aplikasi: qcResultFromText(latestDaily.appStatus, "Lengkap"),
            Partisi: latestDaily.partitionCount === 2 ? "OK" : `${latestDaily.partitionCount} partisi`
          }
        : {};

      return {
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        ssdHealth,
        batteryHealth,
        hargaJualRekomendasi: unit.hargaJualRekomendasi,
        statusObservasi,
        candidateReturNote,
        qcAwal: {
          tanggal: latestDaily?.tanggal.toISOString().slice(0, 10) ?? unit.qcAwal?.tanggal.toISOString().slice(0, 10) ?? "-",
          checker: latestDaily?.checker.name ?? unit.qcAwal?.checker.name ?? "-",
          hardware: latestDaily ? dailyHardware : unit.qcAwal ? {
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
            Battery: batteryHealth > 0 ? `${batteryHealth}%` : unit.qcAwal.battery,
            SSD: ssdHealth > 0 ? `${ssdHealth}%` : unit.qcAwal.ssd
          } : {},
          software: latestDaily ? dailySoftware : unit.qcAwal ? {
            OS: unit.qcAwal.osInstalled,
            Windows: unit.qcAwal.windowsVersion,
            "Update OS": unit.qcAwal.updateOs,
            Driver: unit.qcAwal.driver,
            "Security Patch": unit.qcAwal.securityPatch,
            Aplikasi: unit.qcAwal.aplikasiDefault
          } : {}
        }
      };
    });
  } catch {
    return demoUnits;
  }
}
