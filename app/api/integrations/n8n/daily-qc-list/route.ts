import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function todayJakartaRange() {
  const today = jakartaDateKey();
  const start = new Date(`${today}T00:00:00.000+07:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    today,
    start,
    end
  };
}

export async function GET() {
  const publicUrl = process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id";
  const { today, start, end } = todayJakartaRange();

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
    return !latest || latest.tanggal < start || latest.tanggal >= end;
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
      catatanTerakhir: latest?.catatan ?? "",
      detailUrl: `${publicUrl}/unit/${unit.id}`,
      qcUrl: `${publicUrl}/qc-harian?unit=${unit.id}`
    };
  });

  const previewRows = rows.slice(0, 40);
  const extraCount = Math.max(rows.length - previewRows.length, 0);
  const whatsappText = [
    `*QC Harian FS Comp - ${today}*`,
    `Perlu dicek hari ini: ${rows.length} unit`,
    "",
    ...previewRows.map((unit, index) => [
      `${index + 1}. Unit ${unit.nomorUnit} - ${unit.model}`,
      `   ${unit.lokasi} | ${unit.status}`,
      `   Last QC: ${unit.lastQcAt}`,
      `   SSD ${unit.ssdHealth ?? "-"}% / Battery ${unit.batteryHealth ?? "-"}%`,
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
