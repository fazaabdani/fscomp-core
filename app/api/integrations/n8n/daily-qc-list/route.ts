import { NextResponse } from "next/server";
import { forbidden, hasIntegrationAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { QC_DUE_HOURS, isQcFresh, qcAgeHours } from "@/lib/qc-due";

export const dynamic = "force-dynamic";

function jakartaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function formatDateTimeWib(date?: Date | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export async function GET(request: Request) {
  if (!hasIntegrationAccess(request, "N8N_WEBHOOK_SECRET")) return forbidden();
  const publicUrl = process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id";
  const now = new Date();
  const today = jakartaDateKey(now);

  const units = await prisma.unit.findMany({
    where: {
      soldAt: null,
      statusObservasi: { not: "RETUR_DISTRIBUTOR" }
    },
    select: {
      id: true,
      nomorUnit: true,
      model: true,
      processor: true,
      ram: true,
      ssd: true,
      stockLocation: true,
      statusObservasi: true,
      batteryHealth: true,
      ssdHealth: true,
      aiLogs: {
        where: { status: "OPEN", source: "qc-harian-reminder" },
        orderBy: { tanggal: "desc" },
        take: 2,
        select: { rekomendasi: true }
      },
      qcHarian: {
        orderBy: { tanggal: "desc" },
        take: 1,
        select: {
          tanggal: true,
          masihLolos: true,
          ssdHealth: true,
          batteryHealth: true,
          catatan: true
        }
      }
    },
    orderBy: [{ stockLocation: "asc" }, { nomorUnit: "asc" }]
  });

  const dueUnits = units.filter((unit) => {
    const latest = unit.qcHarian[0];
    return !isQcFresh(latest?.tanggal, now);
  });

  const rows = dueUnits.map((unit) => {
    const latest = unit.qcHarian[0];
    return {
      id: unit.id,
      nomorUnit: unit.nomorUnit,
      model: unit.model,
      spek: `${unit.processor} / ${unit.ram} / ${unit.ssd}`,
      lokasi: unit.stockLocation,
      status: unit.statusObservasi.replaceAll("_", " "),
      ssdHealth: latest?.ssdHealth ?? unit.ssdHealth ?? null,
      batteryHealth: latest?.batteryHealth ?? unit.batteryHealth ?? null,
      lastQcAt: latest ? formatDateTimeWib(latest.tanggal) : "Belum pernah QC harian",
      qcAgeHours: qcAgeHours(latest?.tanggal, now),
      catatanTerakhir: latest?.catatan ?? "",
      penyelesaian: unit.aiLogs.map((log) => log.rekomendasi),
      detailUrl: `${publicUrl}/unit/${unit.id}`,
      qcUrl: `${publicUrl}/qc-harian?unit=${unit.id}`
    };
  });

  const previewRows = rows.slice(0, 40);
  const extraCount = Math.max(rows.length - previewRows.length, 0);
  const whatsappText = [
    `*QC Harian FS Comp - ${today}*`,
    `Wajib QC harian: ${rows.length} unit`,
    `Aturan: maksimal ${QC_DUE_HOURS} jam sekali per unit`,
    "",
    ...previewRows.map((unit, index) => [
      `${index + 1}. Unit ${unit.nomorUnit} - ${unit.model}`,
      `   ${unit.lokasi} | ${unit.status}`,
      `   Last QC: ${unit.lastQcAt}${unit.qcAgeHours === null ? "" : ` (${unit.qcAgeHours} jam lalu)`}`,
      `   SSD ${unit.ssdHealth ?? "-"}% / Battery ${unit.batteryHealth ?? "-"}%`,
      ...(unit.penyelesaian.length > 0 ? [`   Perlu diselesaikan: ${unit.penyelesaian.join(" | ")}`] : []),
      `   ${unit.qcUrl}`
    ].join("\n")),
    extraCount > 0 ? `\n+${extraCount} unit lagi. Buka Core untuk list lengkap.` : ""
  ].filter(Boolean).join("\n");

  return NextResponse.json({
    title: "FS Comp Core - List QC Harian",
    generatedAt: new Date().toISOString(),
    tanggalWib: today,
    count: rows.length,
    units: rows,
    whatsappText
  });
}
