import { units as demoUnits } from "./api";
import { prisma } from "./prisma";

function qcResultFromBoolean(ok: boolean) {
  return ok ? "OK" : "FAIL";
}

function qcResultFromNote(ok: boolean) {
  return ok ? "OK" : "NOTES";
}

function qcResultFromText(value: string, okValue: string) {
  if (value === okValue) return "OK";
  if (value === "Garis" || value === "Pecah" || value === "Bajakan" || value === "Bermasalah") return "FAIL";
  return "NOTES";
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
      const dailyHardware = latestDaily
        ? {
            Layar: qcResultFromText(latestDaily.screenCondition, "Normal"),
            Keyboard: qcResultFromBoolean(latestDaily.keyboard),
            ...(latestDaily.keyboardBacklight ? { Backlight: "OK" } : {}),
            USB: qcResultFromBoolean(latestDaily.usb),
            Kamera: qcResultFromBoolean(latestDaily.camera),
            Touchpad: qcResultFromBoolean(latestDaily.touchpad),
            Trackpoint: qcResultFromNote(latestDaily.trackpoint),
            Bluetooth: qcResultFromNote(latestDaily.bluetooth),
            Speaker: qcResultFromBoolean(latestDaily.speaker),
            Mic: qcResultFromBoolean(latestDaily.mic),
            "Body Broken": latestDaily.bodyBroken ? "FAIL" : "OK",
            "Karet Bawah": qcResultFromNote(latestDaily.karetBawah),
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
            Partisi: latestDaily.partitionCount === 2 ? "OK" : "NOTES"
          }
        : {};

      return {
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        ssdHealth,
        batteryHealth,
        hargaJualRekomendasi: unit.hargaJualRekomendasi,
        statusObservasi: unit.statusObservasi.replaceAll("_", " "),
        qcAwal: {
          tanggal: latestDaily?.tanggal.toISOString().slice(0, 10) ?? unit.qcAwal?.tanggal.toISOString().slice(0, 10) ?? "-",
          checker: latestDaily?.checker.name ?? unit.qcAwal?.checker.name ?? "-",
          hardware: latestDaily
            ? dailyHardware
            : unit.qcAwal
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
                Battery: batteryHealth > 0 ? `${batteryHealth}%` : unit.qcAwal.battery,
                SSD: ssdHealth > 0 ? `${ssdHealth}%` : unit.qcAwal.ssd
              }
            : {},
          software: latestDaily
            ? dailySoftware
            : unit.qcAwal
            ? {
                OS: unit.qcAwal.osInstalled,
                Windows: unit.qcAwal.windowsVersion,
                "Update OS": unit.qcAwal.updateOs,
                Driver: unit.qcAwal.driver,
                "Security Patch": unit.qcAwal.securityPatch,
                Aplikasi: unit.qcAwal.aplikasiDefault
              }
            : {}
        }
      };
    });
  } catch {
    return demoUnits;
  }
}
