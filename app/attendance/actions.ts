"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOrCreateDbUserForSession } from "@/lib/user-store";

function startOfToday() {
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  return new Date(`${jakartaDate}T00:00:00+07:00`);
}

function endOfToday() {
  const now = new Date();
  const jakartaDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  return new Date(`${jakartaDate}T23:59:59.999+07:00`);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberOrNull(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : null;
}

function photoValue(formData: FormData) {
  const value = text(formData, "photoDataUrl");
  return value.startsWith("data:image/jpeg;base64,") && value.length < 300000 ? value : null;
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

  const photoDataUrl = photoValue(formData);
  const latitude = numberOrNull(formData, "latitude");
  const longitude = numberOrNull(formData, "longitude");
  const accuracy = numberOrNull(formData, "accuracy");

  if (!photoDataUrl || latitude === null || longitude === null) {
    redirect("/attendance?error=photo-location-required");
  }

  await prisma.attendance.create({
    data: {
      userId: dbUser.id,
      status: "HADIR",
      note: text(formData, "note") || null,
      photoDataUrl,
      latitude,
      longitude,
      accuracy
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
