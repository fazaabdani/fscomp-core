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

function qcStatusFromFlow(value: string): UnitStatus {
  if (value === "CANDIDATE_RETUR") return "CANDIDATE_RETUR";
  return "RECHECK";
}

export async function createUnitWithInitialQcAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi"]);
  const batchId = text(formData, "batchId");
  const nomorUnit = text(formData, "nomorUnit");
  const merk = text(formData, "merk");
  const seri = text(formData, "seri");
  const model = text(formData, "model") || [merk, seri].filter(Boolean).join(" ");
  const processor = text(formData, "processor");
  const ram = text(formData, "ram");
  const ssd = text(formData, "storage") || text(formData, "ssd");
  const display = text(formData, "display");
  const fiturTambahan = text(formData, "fiturTambahan");
  const minus = text(formData, "minus") || text(formData, "catatan");

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
  const status = (text(formData, "statusObservasi") as UnitStatus) || qcStatusFromFlow(text(formData, "qcFlowStatus"));
  const qcOk: QcResult = "OK";
  const minusLower = minus.toLowerCase();
  const featureLower = fiturTambahan.toLowerCase();
  const displayLower = display.toLowerCase();
  const hasMinus = minus.trim().length > 0;
  const catatan = [
    merk ? `Merk: ${merk}` : "",
    seri ? `Seri: ${seri}` : "",
    fiturTambahan ? `Fitur tambahan: ${fiturTambahan}` : "",
    minus ? `Minus: ${minus}` : "",
    text(formData, "qcFlowStatus") ? `Status alur: ${text(formData, "qcFlowStatus").replaceAll("_", " ")}` : ""
  ].filter(Boolean).join("\n");

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
      lcdSize: display || text(formData, "lcdSize"),
      lcdResolution: display || text(formData, "lcdResolution"),
      isTouchscreen: text(formData, "isTouchscreen") === "Ya" || displayLower.includes("touch") || featureLower.includes("touch"),
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
          bodyBroken: minusLower.includes("body") || minusLower.includes("casing") || minusLower.includes("retak") ? "NOTES" : qcOk,
          karetBawah: minusLower.includes("karet") ? "NOTES" : qcOk,
          repaint: minusLower.includes("repaint") ? "NOTES" : qcOk,
          layar: minusLower.includes("layar") || minusLower.includes("lcd") ? "NOTES" : qcOk,
          ukuranLcd: qcOk,
          resolusiLayar: qcOk,
          touchscreen: displayLower.includes("touch") || featureLower.includes("touch") ? "OK" : qcOk,
          keyboard: minusLower.includes("keyboard") ? "NOTES" : qcOk,
          touchpad: minusLower.includes("touchpad") ? "NOTES" : qcOk,
          trackpoint: minusLower.includes("trackpoint") ? "NOTES" : qcOk,
          usb: minusLower.includes("usb") ? "NOTES" : qcOk,
          kamera: minusLower.includes("kamera") || minusLower.includes("camera") ? "NOTES" : qcOk,
          port: qcOk,
          speaker: minusLower.includes("speaker") ? "NOTES" : qcOk,
          mic: minusLower.includes("mic") ? "NOTES" : qcOk,
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
          reminder: hasMinus ? ["Selesaikan minus sebelum siap jual", "Cek update OS dan aplikasi sebelum katalog"] : ["Cek update OS dan aplikasi sebelum katalog"],
          catatan
        }
      }
    }
  });

  revalidatePath("/batch-psi");
  revalidatePath("/qc-harian");
  revalidatePath("/");
  redirect(`/unit/${unit.id}`);
}
