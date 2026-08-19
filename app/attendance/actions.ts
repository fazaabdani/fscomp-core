"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getOrCreateDbUserForSession } from "@/lib/user-store";
import { formValues, requiredText, z } from "@/lib/form-validation";

function requiredString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function parseOptionalFloat(value: FormDataEntryValue | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function todayJakartaDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function startOfToday() {
  return new Date(`${todayJakartaDateString()}T00:00:00+07:00`);
}

function endOfToday() {
  return new Date(`${todayJakartaDateString()}T23:59:59.999+07:00`);
}

export async function checkInAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi", "sales", "magang"]);
  const validation = z.object({
    photoDataUrl: requiredText(8_000_000),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    accuracy: z.coerce.number().min(0).max(100_000).optional()
  }).safeParse(formValues(formData));
  if (!validation.success) redirect("/attendance?error=invalid-input");
  const dbUser = await getOrCreateDbUserForSession(currentUser);
  const now = new Date();
  const photoDataUrl = requiredString(formData, "photoDataUrl");
  const latitude = parseOptionalFloat(formData.get("latitude"));
  const longitude = parseOptionalFloat(formData.get("longitude"));
  const accuracy = parseOptionalFloat(formData.get("accuracy"));

  if (!photoDataUrl || latitude === null || longitude === null) {
    redirect("/attendance?error=photo-location-required");
  }

  const existingOpen = await prisma.attendance.findFirst({
    where: {
      userId: dbUser.id,
      checkInAt: { gte: startOfToday(), lte: endOfToday() },
      checkOutAt: null
    }
  });

  if (existingOpen) {
    redirect("/attendance?error=already-in");
  }

  try {
    await prisma.attendance.create({
      data: {
        userId: dbUser.id,
        tanggal: now,
        checkInAt: now,
        status: "HADIR",
        note: requiredString(formData, "note") || null,
        photoDataUrl,
        latitude,
        longitude,
        accuracy
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/attendance?error=already-in");
    }
    throw error;
  }

  redirect("/attendance?success=check-in");
}

export async function checkOutAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi", "sales", "magang"]);
  const dbUser = await getOrCreateDbUserForSession(currentUser);

  const open = await prisma.attendance.findFirst({
    where: {
      userId: dbUser.id,
      checkInAt: { gte: startOfToday(), lte: endOfToday() },
      checkOutAt: null
    },
    orderBy: { checkInAt: "desc" }
  });

  if (!open) {
    redirect("/attendance?error=no-open-attendance");
  }

  await prisma.attendance.update({
    where: { id: open.id },
    data: {
      checkOutAt: new Date(),
      note: requiredString(formData, "note") || open.note
    }
  });

  redirect("/attendance?success=check-out");
}
