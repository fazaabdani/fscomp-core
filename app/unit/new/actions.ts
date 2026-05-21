"use server";

import { QcResult, Role, UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { batches as demoBatches } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
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

export async function createUnitWithInitialQcAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi"]);
  const batchId = text(formData, "batchId");
  const nomorUnit = text(formData, "nomorUnit");
  const model = text(formData, "model");
  const processor = text(formData, "processor");
  const ram = text(formData, "ram");
  const ssd = text(formData, "ssd");

  if (!batchId || !nomorUnit || !model || !processor || !ram || !ssd) {
    redirect(`/unit/new?batch=${batchId}&error=required`);
  }

  let batch = await prisma.batchPSI.findUnique({ where: { id: batchId } });
  if (!batch) {
    const demoBatch = demoBatches.find((item) => item.id === batchId);
    if (demoBatch) {
      batch = await prisma.batchPSI.create({
        data: {
          id: demoBatch.id,
          nomorBatch: demoBatch.nomorBatch,
          supplier: demoBatch.supplier,
          tanggalMasuk: new Date(demoBatch.tanggalMasuk),
          tanggalTempo: new Date(demoBatch.tanggalTempo),
          statusPembayaran: "BELUM_JATUH_TEMPO",
          catatan: demoBatch.catatan
        }
      });
    }
  }

  if (!batch) {
    redirect("/batch-psi?error=batch-not-found");
  }

  const checker = await ensureChecker(currentUser.name, currentUser.role);
  const ssdHealth = numberValue(formData, "ssdHealth");
  const batteryHealth = numberValue(formData, "batteryHealth");
  const status = text(formData, "statusObservasi") as UnitStatus;
  const qcOk: QcResult = "OK";

  const unit = await prisma.unit.create({
    data: {
      nomorUnit,
      batchId,
      supplier: batch.supplier,
      model,
      processor,
      ram,
      ssd,
      ssdSerial: text(formData, "ssdSerial"),
      lcdSize: text(formData, "lcdSize"),
      lcdResolution: text(formData, "lcdResolution"),
      isTouchscreen: text(formData, "isTouchscreen") === "Ya",
      hargaModal: numberValue(formData, "hargaModal"),
      hargaJualRekomendasi: numberValue(formData, "hargaJualRekomendasi"),
      batteryHealth,
      ssdHealth,
      statusObservasi: status || "RECHECK",
      tanggalMasuk: batch.tanggalMasuk,
      tempo: batch.tanggalTempo,
      qcAwal: {
        create: {
          checkerId: checker.id,
          tanggal: new Date(),
          status: status || "RECHECK",
          body: qcOk,
          bodyBroken: text(formData, "bodyBroken") === "FAIL" ? "FAIL" : qcOk,
          karetBawah: text(formData, "karetBawah") === "FAIL" ? "FAIL" : qcOk,
          repaint: text(formData, "repaint") === "NOTES" ? "NOTES" : qcOk,
          layar: qcOk,
          ukuranLcd: qcOk,
          resolusiLayar: qcOk,
          touchscreen: qcOk,
          keyboard: qcOk,
          touchpad: text(formData, "touchpad") === "FAIL" ? "FAIL" : qcOk,
          trackpoint: text(formData, "trackpoint") === "FAIL" ? "FAIL" : qcOk,
          usb: text(formData, "usb") === "FAIL" ? "FAIL" : qcOk,
          kamera: text(formData, "kamera") === "FAIL" ? "FAIL" : qcOk,
          port: qcOk,
          speaker: text(formData, "speaker") === "FAIL" ? "FAIL" : qcOk,
          mic: text(formData, "mic") === "FAIL" ? "FAIL" : qcOk,
          charger: qcOk,
          battery: batteryHealth < 50 ? "FAIL" : batteryHealth < 70 ? "NOTES" : "OK",
          ssd: ssdHealth < 80 ? "NOTES" : "OK",
          seriSsd: qcOk,
          osInstalled: qcOk,
          windowsVersion: text(formData, "windowsVersion") || "Windows 11",
          updateOs: "NOTES",
          driver: qcOk,
          securityPatch: "NOTES",
          aplikasiDefault: qcOk,
          reminder: ["Cek update OS dan aplikasi sebelum katalog"],
          catatan: text(formData, "catatan")
        }
      }
    }
  });

  revalidatePath("/batch-psi");
  revalidatePath("/qc-harian");
  revalidatePath("/");
  redirect(`/unit/${unit.id}`);
}
