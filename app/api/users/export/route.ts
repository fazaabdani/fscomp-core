import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { roleFromDb } from "@/lib/user-store";

function csvCell(value: string | null | undefined) {
  const text = value ?? "";
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const currentUser = getCurrentUser();
  if (currentUser?.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      name: true,
      username: true,
      email: true,
      role: true,
      active: true
    }
  });

  const header = ["Nama", "Username", "Password Baru", "Role", "Status", "Email", "Catatan"];
  const rows = users.map((user) => [
    user.name,
    user.username ?? "",
    "",
    roleFromDb(user.role),
    user.active ? "Aktif" : "Nonaktif",
    user.email,
    !user.username ? "USERNAME KOSONG" : ""
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fscomp-users-${today}.csv"`
    }
  });
}
