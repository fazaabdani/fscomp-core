"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOrCreateDbUserForSession } from "@/lib/user-store";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function checkInAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi", "magang"]);
  const dbUser = await getOrCreateDbUserForSession(currentUser);
  const existing = await prisma.attendance.findFirst({
    where: {
      userId: dbUser.id,
      checkInAt: { gte: startOfToday(), lte: endOfToday() },
      checkOutAt: null
    }
  });

  if (existing) {
    redirect("/attendance?error=already-in");
  }

  await prisma.attendance.create({
    data: {
      userId: dbUser.id,
      status: "HADIR",
      note: text(formData, "note") || null
    }
  });

  revalidatePath("/attendance");
  redirect("/attendance?success=check-in");
}

export async function checkOutAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi", "magang"]);
  const dbUser = await getOrCreateDbUserForSession(currentUser);
  const attendance = await prisma.attendance.findFirst({
    where: {
      userId: dbUser.id,
      checkInAt: { gte: startOfToday(), lte: endOfToday() },
      checkOutAt: null
    },
    orderBy: { checkInAt: "desc" }
  });

  if (!attendance) {
    redirect("/attendance?error=no-open-attendance");
  }

  const extraNote = text(formData, "note");
  await prisma.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOutAt: new Date(),
      note: [attendance.note, extraNote].filter(Boolean).join("\n")
    }
  });

  revalidatePath("/attendance");
  redirect("/attendance?success=check-out");
}
