"use server";

import { DailyStatus, Role } from "@prisma/client";
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
  checks
}: {
  ssdHealth: number;
  batteryHealth: number;
  checks: boolean[];
}): DailyStatus {
  if (batteryHealth < 70 || ssdHealth < 80) return "TIDAK_LOLOS";
  if (checks.some((item) => !item)) return "LOLOS_DENGAN_CATATAN";
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
  const catatan = text(formData, "catatan");
  const dailyChecks = [
    checked(formData, "nyalaNormal"),
    checked(formData, "booting"),
    checked(formData, "keyboard"),
    checked(formData, "ssd"),
    checked(formData, "speaker"),
    checked(formData, "wifi"),
    checked(formData, "bluetooth")
  ];
  const status = computeDailyStatus({ ssdHealth, batteryHealth, checks: dailyChecks });
  const perluKonfirmasi = status === "TIDAK_LOLOS";

  const conditionParts = [
    checked(formData, "nyalaNormal") ? "nyala normal" : "nyala perlu cek",
    checked(formData, "booting") ? "booting normal" : "booting bermasalah",
    checked(formData, "keyboard") ? "keyboard OK" : "keyboard perlu cek",
    checked(formData, "ssd") ? "SSD terbaca" : "SSD perlu cek",
    checked(formData, "speaker") ? "speaker OK" : "speaker perlu cek",
    `SSD health ${ssdHealth}%`,
    `battery health ${batteryHealth}%`,
    checked(formData, "wifi") ? "WiFi OK" : "WiFi perlu cek",
    checked(formData, "bluetooth") ? "Bluetooth OK" : "Bluetooth perlu cek"
  ];

  await prisma.$transaction(async (tx) => {
    await tx.qcHarian.create({
      data: {
        unitId,
        checkerId: checker.id,
        tanggal: new Date(),
        ssdHealth,
        batteryHealth,
        nyalaNormal: checked(formData, "nyalaNormal"),
        booting: checked(formData, "booting"),
        layar: true,
        keyboard: checked(formData, "keyboard"),
        ssd: checked(formData, "ssd"),
        battery: batteryHealth >= 70,
        port: true,
        speaker: checked(formData, "speaker"),
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
        statusObservasi: status === "LOLOS" ? unit.statusObservasi : "RECHECK"
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
