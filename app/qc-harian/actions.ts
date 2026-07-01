"use server";

import { DailyStatus, Role, SaleLocation } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canChangeDailyQcStockLocation } from "@/lib/auth";
import { requireRole } from "@/lib/session";
import { windowsVersionReminder } from "@/lib/windows-recommendation";
import { entityId, formValues, percentage, z } from "@/lib/form-validation";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function screenPasses(screenCondition: string) {
  return screenCondition === "Normal" || screenCondition === "White spot";
}

function computeDailyStatus({
  ssdHealth,
  batteryHealth,
  checks
}: {
  ssdHealth: number;
  batteryHealth: number;
  checks: boolean[];
}): DailyStatus {
  if (batteryHealth < 70 || ssdHealth < 70) return "TIDAK_LOLOS";
  if (checks.some((item) => !item)) return "TIDAK_LOLOS";
  return "LOLOS";
}

function buildResolutionItems({
  processor,
  windowsVersion,
  driverStatus,
  clockStatus,
  appStatus,
  partitionCount,
  officeStatus,
  trackpoint,
  karetBawah,
  paintCondition
}: {
  processor: string;
  windowsVersion: string;
  driverStatus: string;
  clockStatus: string;
  appStatus: string;
  partitionCount: number;
  officeStatus: string;
  trackpoint: boolean;
  karetBawah: boolean;
  paintCondition: string;
}) {
  return [
    windowsVersionReminder(processor, windowsVersion),
    driverStatus !== "OK" ? `Driver ${driverStatus}` : "",
    clockStatus !== "Sesuai" ? `Jam ${clockStatus}` : "",
    appStatus !== "Lengkap" ? `Aplikasi ${appStatus}` : "",
    partitionCount !== 2 ? "Partisi masih 1" : "",
    officeStatus === "Belum install" ? `Office ${officeStatus}` : "",
    !trackpoint ? "Trackpoint perlu dicek" : "",
    !karetBawah ? "Karet bawah tidak lengkap" : "",
    paintCondition === "Repaint parah" || paintCondition === "Kelupas" ? `Kondisi cat ${paintCondition}` : ""
  ].filter(Boolean);
}

async function ensureChecker(name: string, role: "admin" | "teknisi" | "sales" | "magang") {
  const email = `${name.toLowerCase().replaceAll(" ", ".")}@fscomp.local`;
  const dbRole: Role = role === "admin" ? "ADMIN" : role === "teknisi" ? "TEKNISI" : role === "sales" ? "SALES" : "MAGANG";

  return prisma.user.upsert({
    where: { email },
    update: { name, role: dbRole, active: true },
    create: { name, email, role: dbRole }
  });
}

export async function createDailyQcAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi", "sales", "magang"]);
  const validation = z.object({
    unitId: entityId,
    ssdHealth: percentage,
    batteryHealth: percentage,
    stockLocation: z.enum(["WIRADESA", "KAJEN"]),
    partitionCount: z.coerce.number().int().min(1).max(20)
  }).safeParse(formValues(formData));
  if (!validation.success) redirect("/qc-harian?error=invalid-input");
  const unitId = text(formData, "unitId");

  if (!unitId) {
    redirect("/qc-harian?error=unit-required");
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    redirect("/qc-harian?error=unit-not-found");
  }

  const checker = await prisma.user.findUnique({ where: { username: currentUser.username } })
    ?? await ensureChecker(currentUser.name, currentUser.role);
  const ssdHealth = numberValue(formData, "ssdHealth");
  const batteryHealth = numberValue(formData, "batteryHealth");
  const ssdSerial = text(formData, "ssdSerial");
  const screenCondition = text(formData, "screenCondition") || "Normal";
  const windowsVersion = text(formData, "windowsVersion") || "Windows 10";
  const driverStatus = text(formData, "driverStatus") || "OK";
  const clockStatus = text(formData, "clockStatus") || "Sesuai";
  const appStatus = text(formData, "appStatus") || "Lengkap";
  const officeStatus = text(formData, "officeStatus") || "Tidak dicek";
  const partitionCount = numberValue(formData, "partitionCount", 1);
  const requestedLocation: SaleLocation = text(formData, "stockLocation") === "KAJEN" ? "KAJEN" : "WIRADESA";
  const stockLocation = canChangeDailyQcStockLocation(currentUser) ? requestedLocation : unit.stockLocation;
  const locationChanged = stockLocation !== unit.stockLocation;
  const bodyBroken = text(formData, "bodyBroken") === "Ya";
  const paintCondition = text(formData, "paintCondition") || "Normal";
  const catatan = text(formData, "catatan");
  const keyboardBacklight = checked(formData, "keyboardBacklight");
  const screenCritical = !screenPasses(screenCondition);
  const resolutionItems = buildResolutionItems({
    processor: unit.processor,
    windowsVersion,
    driverStatus,
    clockStatus,
    appStatus,
    partitionCount,
    officeStatus,
    trackpoint: checked(formData, "trackpoint"),
    karetBawah: checked(formData, "karetBawah"),
    paintCondition
  });
  const dailyChecks = [
    checked(formData, "keyboard"),
    checked(formData, "wifi"),
    checked(formData, "usb"),
    checked(formData, "camera"),
    checked(formData, "touchpad"),
    checked(formData, "speaker"),
    checked(formData, "mic"),
    !screenCritical,
    !bodyBroken
  ];
  const status = computeDailyStatus({ ssdHealth, batteryHealth, checks: dailyChecks });
  const perluKonfirmasi = status === "TIDAK_LOLOS";
  const nextUnitStatus = status === "TIDAK_LOLOS" ? (screenCritical ? "CANDIDATE_RETUR" : "RECHECK") : resolutionItems.length > 0 ? "VERIFIED_WITH_NOTES" : "VERIFIED";

  const conditionParts = [
    `layar ${screenCondition}`,
    checked(formData, "keyboard") ? "keyboard OK" : "keyboard perlu cek",
    keyboardBacklight ? "keyboard backlight ada" : "",
    checked(formData, "wifi") ? "WiFi OK" : "WiFi perlu cek",
    checked(formData, "usb") ? "USB OK" : "USB perlu cek",
    checked(formData, "camera") ? "camera OK" : "camera perlu cek",
    checked(formData, "touchpad") ? "touchpad OK" : "touchpad perlu cek",
    checked(formData, "trackpoint") ? "trackpoint OK" : "trackpoint perlu cek",
    checked(formData, "bluetooth") ? "Bluetooth OK" : "Bluetooth perlu cek",
    checked(formData, "speaker") ? "speaker OK" : "speaker perlu cek",
    checked(formData, "mic") ? "mic OK" : "mic perlu cek",
    bodyBroken ? "body broken" : "body tidak broken",
    checked(formData, "karetBawah") ? "karet bawah OK" : "karet bawah tidak lengkap",
    `OS ${windowsVersion}`,
    `driver ${driverStatus}`,
    `jam ${clockStatus}`,
    `aplikasi ${appStatus}`,
    `Office ${officeStatus}`,
    `${partitionCount} partisi`,
    ssdSerial ? `seri SSD ${ssdSerial}` : "seri SSD belum diisi",
    `SSD health ${ssdHealth}%`,
    `battery health ${batteryHealth}%`,
    resolutionItems.length > 0 ? `perlu diselesaikan: ${resolutionItems.join("; ")}` : ""
  ];

  await prisma.$transaction(async (tx) => {
    await tx.qcHarian.create({
      data: {
        unitId,
        checkerId: checker.id,
        tanggal: new Date(),
        ssdHealth,
        batteryHealth,
        ssdSerial: ssdSerial || null,
        screenCondition,
        windowsVersion,
        driverStatus,
        clockStatus,
        appStatus,
        officeStatus,
        partitionCount,
        nyalaNormal: true,
        booting: true,
        layar: !screenCritical,
        keyboard: checked(formData, "keyboard"),
        keyboardBacklight,
        ssd: ssdHealth >= 70,
        battery: batteryHealth >= 70,
        port: checked(formData, "usb"),
        usb: checked(formData, "usb"),
        camera: checked(formData, "camera"),
        touchpad: checked(formData, "touchpad"),
        trackpoint: checked(formData, "trackpoint"),
        bodyBroken,
        karetBawah: checked(formData, "karetBawah"),
        paintCondition,
        speaker: checked(formData, "speaker"),
        mic: checked(formData, "mic"),
        wifi: checked(formData, "wifi"),
        bluetooth: checked(formData, "bluetooth"),
        kondisiHariIni: catatan || `${conditionParts.filter(Boolean).join(", ")}. Status otomatis: ${status.replaceAll("_", " ")}`,
        masihLolos: status,
        catatan
      }
    });

    await tx.unit.update({
      where: { id: unitId },
      data: {
        ssdHealth,
        batteryHealth,
        ssdSerial: ssdSerial || unit.ssdSerial,
        stockLocation,
        statusObservasi: nextUnitStatus
      }
    });

    if (locationChanged) {
      await tx.unitAuditLog.create({
        data: {
          unitId,
          action: "STOCK_LOCATION_CHANGED_FROM_DAILY_QC",
          actorName: currentUser.name,
          actorUsername: currentUser.username,
          actorRole: currentUser.role,
          changes: {
            stockLocation: { from: unit.stockLocation, to: stockLocation },
            source: "QC_HARIAN"
          }
        }
      });
    }

    if (perluKonfirmasi) {
      await tx.aiLog.create({
        data: {
          unitId,
          source: "qc-harian-auto",
          rekomendasi: screenCritical
            ? `Candidate retur dari QC harian: layar ${screenCondition}. Catatan: ${catatan || "belum ada catatan tambahan"}.`
            : `Perlu konfirmasi QC harian: SSD ${ssdHealth}%, battery ${batteryHealth}%. Unit otomatis tidak lolos sebelum dicek teknisi/admin.`
        }
      });
    }

    if (resolutionItems.length > 0) {
      await tx.aiLog.create({
        data: {
          unitId,
          source: "qc-harian-reminder",
          rekomendasi: `Perlu diselesaikan sebelum finishing: ${resolutionItems.join("; ")}. Unit tetap boleh lanjut jual selama hardware lolos.`
        }
      });
    }
  });

  revalidatePath("/qc-harian");
  revalidatePath(`/unit/${unitId}`);
  revalidatePath("/");
  redirect("/qc-harian?saved=1");
}
