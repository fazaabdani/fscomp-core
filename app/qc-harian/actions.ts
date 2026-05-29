"use server";

import { DailyStatus, Role, SaleLocation } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

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

function computeDailyStatus({
  ssdHealth,
  batteryHealth,
  checks,
  noteChecks
}: {
  ssdHealth: number;
  batteryHealth: number;
  checks: boolean[];
  noteChecks: boolean[];
}): DailyStatus {
  if (batteryHealth < 70 || ssdHealth < 80) return "TIDAK_LOLOS";
  if (checks.some((item) => !item)) return "TIDAK_LOLOS";
  if (noteChecks.some((item) => !item)) return "LOLOS_DENGAN_CATATAN";
  return "LOLOS";
}

async function ensureChecker(name: string, role: "admin" | "teknisi" | "magang") {
  const email = `${name.toLowerCase().replaceAll(" ", ".")}@fscomp.local`;
  const dbRole: Role = role === "admin" ? "ADMIN" : role === "teknisi" ? "TEKNISI" : "MAGANG";

  return prisma.user.upsert({
    where: { email },
    update: { name, role: dbRole, active: true },
    create: { name, email, role: dbRole }
  });
}

export async function createDailyQcAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi", "magang"]);
  const unitId = text(formData, "unitId");
  const checkerName = text(formData, "checkerName");

  if (!unitId) {
    redirect("/qc-harian?error=unit-required");
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    redirect("/qc-harian?error=unit-not-found");
  }

  const checker = await ensureChecker(checkerName || currentUser.name, "magang");
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
  const stockLocation = (text(formData, "stockLocation") || "WIRADESA") as SaleLocation;
  const bodyBroken = text(formData, "bodyBroken") === "Ya";
  const paintCondition = text(formData, "paintCondition") || "Normal";
  const catatan = text(formData, "catatan");
  const screenCritical = screenCondition === "Garis" || screenCondition === "Pecah";
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
  const noteChecks = [
    checked(formData, "trackpoint"),
    checked(formData, "bluetooth"),
    checked(formData, "karetBawah"),
    screenCondition === "Normal",
    driverStatus === "OK",
    clockStatus === "Sesuai",
    appStatus === "Lengkap",
    officeStatus !== "Bajakan",
    partitionCount === 2,
    paintCondition === "Normal"
  ];
  const status = computeDailyStatus({ ssdHealth, batteryHealth, checks: dailyChecks, noteChecks });
  const perluKonfirmasi = status === "TIDAK_LOLOS";

  const conditionParts = [
    `layar ${screenCondition}`,
    checked(formData, "keyboard") ? "keyboard OK" : "keyboard perlu cek",
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
    `battery health ${batteryHealth}%`
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
        ssd: ssdHealth >= 80,
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
        kondisiHariIni: catatan || `${conditionParts.join(", ")}. Status otomatis: ${status.replaceAll("_", " ")}`,
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
        statusObservasi: status === "TIDAK_LOLOS" ? "RECHECK" : "VERIFIED_WITH_NOTES"
      }
    });

    if (perluKonfirmasi) {
      await tx.aiLog.create({
        data: {
          unitId,
          source: "qc-harian-auto",
          rekomendasi: `Perlu konfirmasi QC harian: SSD ${ssdHealth}%, battery ${batteryHealth}%. Unit otomatis tidak lolos sebelum dicek teknisi/admin.`
        }
      });
    }
  });

  revalidatePath("/qc-harian");
  revalidatePath(`/unit/${unitId}`);
  revalidatePath("/");
  redirect("/qc-harian?saved=1");
}
