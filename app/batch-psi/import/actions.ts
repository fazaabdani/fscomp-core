"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { dateInput, formValues, requiredText, z } from "@/lib/form-validation";

type ImportRow = {
  merk: string;
  seri: string;
  processor: string;
  ram: string;
  ssd: string;
  layar: string;
  qty: number;
  problem: string;
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function splitLine(line: string) {
  if (line.includes("\t")) return line.split("\t");
  return line.split(",").map((item) => item.trim());
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "").replaceAll("_", "");
}

function parseRows(raw: string): ImportRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitLine(lines[0]).map(normalizeHeader);
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));

  const merkIndex = indexOf("merk", "brand");
  const seriIndex = indexOf("seri", "model", "type", "tipe");
  const processorIndex = indexOf("prosesor", "processor", "prosessor");
  const ramIndex = indexOf("ram");
  const ssdIndex = indexOf("ssd", "storage");
  const layarIndex = indexOf("layar", "lcd", "screen");
  const qtyIndex = indexOf("qty", "jumlah");
  const problemIndex = indexOf("problem", "masalah", "catatan");

  return lines.slice(1).map((line) => {
    const cols = splitLine(line);
    return {
      merk: cols[merkIndex] ?? "",
      seri: cols[seriIndex] ?? "",
      processor: cols[processorIndex] ?? "",
      ram: cols[ramIndex] ?? "",
      ssd: cols[ssdIndex] ?? "",
      layar: cols[layarIndex] ?? "",
      qty: Math.max(1, Number(cols[qtyIndex] ?? 1) || 1),
      problem: problemIndex >= 0 ? cols[problemIndex] ?? "" : ""
    };
  }).filter((row) => row.merk || row.seri);
}

function inferResolution(layar: string) {
  const normalized = layar.toLowerCase();
  if (normalized.includes("fhd") || normalized.includes("full hd")) return "1920x1080";
  if (normalized.includes("uhd") || normalized.includes("4k")) return "3840x2160";
  return "";
}

function inferTouchscreen(layar: string) {
  return layar.toLowerCase().includes("touch");
}

function cleanBatchToken(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function importSpreadsheetBatchAction(formData: FormData) {
  await requireRole(["admin", "teknisi"]);
  const validation = z.object({
    nomorBatch: requiredText(100),
    supplier: requiredText(160),
    tanggalMasuk: dateInput,
    tanggalTempo: dateInput,
    rows: requiredText(2_000_000)
  }).safeParse(formValues(formData));
  if (!validation.success) redirect("/batch-psi/import?error=invalid-input");

  const nomorBatch = text(formData, "nomorBatch");
  const supplier = text(formData, "supplier");
  const tanggalMasuk = text(formData, "tanggalMasuk");
  const tanggalTempo = text(formData, "tanggalTempo");
  const rawRows = text(formData, "rows");
  const rows = parseRows(rawRows);

  if (!nomorBatch || !supplier || !tanggalMasuk || !tanggalTempo || rows.length === 0) {
    redirect("/batch-psi/import?error=required");
  }

  const batch = await prisma.batchPSI.upsert({
    where: { nomorBatch },
    update: {
      supplier,
      tanggalMasuk: new Date(tanggalMasuk),
      tanggalTempo: new Date(tanggalTempo)
    },
    create: {
      nomorBatch,
      supplier,
      tanggalMasuk: new Date(tanggalMasuk),
      tanggalTempo: new Date(tanggalTempo),
      catatan: "Import awal dari spreadsheet PSI. Unit perlu QC sebelum masuk katalog."
    }
  });

  const existingUnits = await prisma.unit.findMany({ where: { batchId: batch.id }, select: { nomorUnit: true } });
  const existingNumbers = existingUnits.map((existingUnit) => {
    const match = existingUnit.nomorUnit.match(/-(\d+)$/);
    return match ? Number(match[1]) : 0;
  });
  let running = (existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0) + 1;
  const batchToken = cleanBatchToken(nomorBatch);
  let importedCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        for (let item = 0; item < row.qty; item += 1) {
          const nomorUnit = `${batchToken}-${String(running).padStart(3, "0")}`;
          running += 1;

          const unit = await tx.unit.create({
            data: {
              nomorUnit,
              batchId: batch.id,
              supplier,
              model: `${row.merk} ${row.seri}`.trim(),
              processor: row.processor,
              ram: row.ram,
              ssd: row.ssd,
              lcdSize: row.layar,
              lcdResolution: inferResolution(row.layar),
              isTouchscreen: inferTouchscreen(row.layar),
              hargaModal: 0,
              hargaJualRekomendasi: 0,
              statusObservasi: "RECHECK",
              tanggalMasuk: new Date(tanggalMasuk),
              tempo: new Date(tanggalTempo)
            }
          });
          importedCount += 1;

          if (row.problem) {
            await tx.aiLog.create({
              data: {
                unitId: unit.id,
                rekomendasi: `Problem awal dari spreadsheet PSI: ${row.problem}`,
                source: "spreadsheet-import"
              }
            });
          }
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/batch-psi/import?error=nomor-unit-bentrok");
    }
    throw error;
  }

  revalidatePath("/batch-psi");
  revalidatePath("/qc-harian");
  revalidatePath("/");
  redirect(`/batch-psi?imported=${importedCount}`);
}
