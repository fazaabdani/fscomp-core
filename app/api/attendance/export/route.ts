import { csvCell } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function formatDateTimeWib(date?: Date | null) {
  if (!date) return "";
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function parseDateParam(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+07:00`);
}

export async function GET(request: Request) {
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const from = parseDateParam(url.searchParams.get("from"));
  const to = parseDateParam(url.searchParams.get("to"), true);
  const where = from || to ? { checkInAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const records = await prisma.attendance.findMany({
    where,
    include: { user: true },
    orderBy: [{ checkInAt: "desc" }, { user: { name: "asc" } }]
  });

  const header = [
    "Tanggal Masuk WIB",
    "Nama",
    "Username",
    "Role",
    "Jam Masuk WIB",
    "Jam Pulang WIB",
    "Status",
    "Durasi Menit",
    "Latitude",
    "Longitude",
    "Akurasi Meter",
    "Link Maps",
    "Ada Foto",
    "Catatan"
  ];
  const rows = records.map((record) => {
    const durationMinutes = record.checkOutAt
      ? Math.max(0, Math.round((record.checkOutAt.getTime() - record.checkInAt.getTime()) / 60000))
      : "";
    const mapsLink = record.latitude && record.longitude
      ? `https://www.google.com/maps?q=${record.latitude},${record.longitude}`
      : "";
    return [
      formatDateTimeWib(record.checkInAt).slice(0, 10),
      record.user.name,
      record.user.username ?? "",
      record.user.role,
      formatDateTimeWib(record.checkInAt),
      formatDateTimeWib(record.checkOutAt),
      record.checkOutAt ? "Selesai" : "Aktif",
      durationMinutes,
      record.latitude ?? "",
      record.longitude ?? "",
      record.accuracy ? Math.round(record.accuracy) : "",
      mapsLink,
      record.photoDataUrl ? "Ya" : "Tidak",
      record.note ?? ""
    ];
  });
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const fileDate = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fscomp-absensi-${fileDate}.csv"`
    }
  });
}
