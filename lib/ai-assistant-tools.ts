import type { User } from "./auth";
import { getFinancePageData } from "./finance-page-data";
import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

export const assistantToolSchemas = [
  {
    type: "function",
    function: {
      name: "search_units",
      description: "Cari unit laptop yang masih ready/belum terjual, boleh difilter merek, RAM, lokasi, atau kata kunci bebas (model/processor).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Kata kunci bebas, contoh: 'ThinkPad', 'i5 gen 8'" },
          merek: { type: "string", description: "Contoh: Lenovo, HP, Dell, Asus, Acer" },
          ram: { type: "string", description: "Contoh: 8GB, 16GB" },
          lokasi: { type: "string", enum: ["Wiradesa", "Kajen"] }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_unit_detail",
      description: "Ambil detail lengkap satu unit berdasarkan nomor unit (boleh sebagian, dicari yang mengandung teks itu).",
      parameters: {
        type: "object",
        properties: {
          nomorUnit: { type: "string", description: "Nomor unit atau sebagiannya, contoh: '13-60'" }
        },
        required: ["nomorUnit"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Ringkasan omzet, modal, dan estimasi profit kotor untuk rentang tanggal tertentu. Khusus admin.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Tanggal mulai format YYYY-MM-DD, kosongkan untuk tanpa batas awal" },
          to: { type: "string", description: "Tanggal akhir format YYYY-MM-DD, kosongkan untuk tanpa batas akhir" }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_batch_status",
      description: "Status pembayaran dan tempo batch PSI (kedatangan unit dari supplier), boleh difilter nomor batch.",
      parameters: {
        type: "object",
        properties: {
          nomorBatch: { type: "string", description: "Nomor batch atau sebagiannya, kosongkan untuk lihat batch yang mendekati/lewat tempo" }
        },
        additionalProperties: false
      }
    }
  }
] as const;

async function searchUnits(args: { query?: string; merek?: string; ram?: string; lokasi?: string }) {
  const units = await prisma.unit.findMany({
    where: {
      soldAt: null,
      statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] },
      ...(args.lokasi ? { stockLocation: args.lokasi.toUpperCase() === "KAJEN" ? "KAJEN" : "WIRADESA" } : {}),
      ...(args.ram ? { ram: { contains: args.ram, mode: "insensitive" } } : {}),
      ...(args.merek ? { model: { contains: args.merek, mode: "insensitive" } } : {}),
      ...(args.query ? { OR: [
        { model: { contains: args.query, mode: "insensitive" } },
        { processor: { contains: args.query, mode: "insensitive" } }
      ] } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      nomorUnit: true,
      model: true,
      processor: true,
      ram: true,
      ssd: true,
      hargaJualRekomendasi: true,
      stockLocation: true,
      statusObservasi: true
    }
  });

  return {
    jumlahDitemukan: units.length,
    unit: units.map((unit) => ({
      nomorUnit: displayUnitNumber(unit.nomorUnit),
      model: unit.model,
      processor: unit.processor,
      ram: unit.ram,
      ssd: unit.ssd,
      harga: unit.hargaJualRekomendasi,
      lokasi: unit.stockLocation === "KAJEN" ? "Kajen" : "Wiradesa",
      status: unit.statusObservasi.replaceAll("_", " ")
    }))
  };
}

async function getUnitDetail(args: { nomorUnit: string }) {
  if (!args.nomorUnit?.trim()) return { error: "Nomor unit wajib diisi." };

  const units = await prisma.unit.findMany({
    where: { nomorUnit: { contains: args.nomorUnit.trim(), mode: "insensitive" } },
    include: {
      qcHarian: { orderBy: { tanggal: "desc" }, take: 1, select: { masihLolos: true, windowsVersion: true, ssdHealth: true, batteryHealth: true } }
    },
    take: 5
  });

  if (units.length === 0) return { error: "Tidak ada unit dengan nomor itu." };

  return {
    unit: units.map((unit) => {
      const latestDaily = unit.qcHarian[0];
      return {
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        harga: unit.hargaJualRekomendasi,
        lokasi: unit.stockLocation === "KAJEN" ? "Kajen" : "Wiradesa",
        status: unit.statusObservasi.replaceAll("_", " "),
        sudahTerjual: Boolean(unit.soldAt),
        qcTerakhir: latestDaily
          ? { lolos: latestDaily.masihLolos !== "TIDAK_LOLOS", windows: latestDaily.windowsVersion, ssdHealth: latestDaily.ssdHealth, batteryHealth: latestDaily.batteryHealth }
          : null
      };
    })
  };
}

async function getSalesSummary(args: { from?: string; to?: string }, user: User) {
  if (user.role !== "admin") return { error: "Data keuangan cuma bisa diakses admin." };

  const { stats } = await getFinancePageData({ from: args.from, to: args.to });
  return {
    periode: { dari: args.from || "(tanpa batas)", sampai: args.to || "(tanpa batas)" },
    omzet: stats.totalOmzet,
    modal: stats.totalModal,
    estimasiProfitKotor: stats.totalProfit,
    estimasiBagianWiradesa: stats.totalWiradesaShare,
    estimasiBagianKajen: stats.totalKajenShare,
    jumlahTransaksi: stats.totalTransaksi
  };
}

async function getBatchStatus(args: { nomorBatch?: string }) {
  const batches = await prisma.batchPSI.findMany({
    where: args.nomorBatch?.trim()
      ? { nomorBatch: { contains: args.nomorBatch.trim(), mode: "insensitive" } }
      : { statusPembayaran: { in: ["MENDEKATI_TEMPO", "BUTUH_FOLLOW_UP"] } },
    include: { _count: { select: { units: true } } },
    orderBy: { tanggalTempo: "asc" },
    take: 15
  });

  if (batches.length === 0) return { batch: [], catatan: "Tidak ada batch yang cocok (atau tidak ada yang mendekati/lewat tempo)." };

  return {
    batch: batches.map((batch) => ({
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      statusPembayaran: batch.statusPembayaran.replaceAll("_", " "),
      jumlahUnit: batch._count.units
    }))
  };
}

export async function executeAssistantTool(name: string, args: Record<string, unknown>, user: User) {
  try {
    switch (name) {
      case "search_units":
        return await searchUnits(args as Parameters<typeof searchUnits>[0]);
      case "get_unit_detail":
        return await getUnitDetail(args as Parameters<typeof getUnitDetail>[0]);
      case "get_sales_summary":
        return await getSalesSummary(args as Parameters<typeof getSalesSummary>[0], user);
      case "get_batch_status":
        return await getBatchStatus(args as Parameters<typeof getBatchStatus>[0]);
      default:
        return { error: "Tool tidak dikenal." };
    }
  } catch {
    return { error: "Gagal mengambil data, coba lagi." };
  }
}
