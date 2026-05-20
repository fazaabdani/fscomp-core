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

function mapDailyStatus(value: string): DailyStatus {
  if (value === "Lolos dengan catatan") return "LOLOS_DENGAN_CATATAN";
  if (value === "Tidak Lolos") return "TIDAK_LOLOS";
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
  const status = mapDailyStatus(text(formData, "masihLolos"));
  const catatan = text(formData, "catatan");

  const conditionParts = [
    checked(formData, "nyalaNormal") ? "nyala normal" : "nyala perlu cek",
    checked(formData, "booting") ? "booting normal" : "booting bermasalah",
    checked(formData, "keyboard") ? "keyboard OK" : "keyboard perlu cek",
    checked(formData, "ssd") ? "SSD terbaca" : "SSD perlu cek",
    `battery health ${batteryHealth}%`,
    checked(formData, "wifi") ? "WiFi OK" : "WiFi perlu cek",
    checked(formData, "bluetooth") ? "Bluetooth OK" : "Bluetooth perlu cek"
  ];

  await prisma.$transaction([
    prisma.qcHarian.create({
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
        battery: batteryHealth >= 50,
        port: true,
        wifi: checked(formData, "wifi"),
        bluetooth: checked(formData, "bluetooth"),
        kondisiHariIni: catatan || conditionParts.join(", "),
        masihLolos: status,
        catatan
      }
    }),
    prisma.unit.update({
      where: { id: unitId },
      data: {
        ssdHealth,
        batteryHealth,
        statusObservasi: status === "TIDAK_LOLOS" ? "RECHECK" : unit.statusObservasi
      }
    })
  ]);

  revalidatePath("/qc-harian");
  revalidatePath(`/unit/${unitId}`);
  revalidatePath("/");
  redirect("/qc-harian?saved=1");
}
