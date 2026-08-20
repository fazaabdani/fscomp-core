"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireRole } from "@/lib/session";
import { roleToDb } from "@/lib/user-store";
import type { User } from "@/lib/auth";
import { entityId, formValues, optionalText, requiredText, z } from "@/lib/form-validation";

const userFormSchema = z.object({
  name: requiredText(160),
  username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().max(200),
  email: optionalText(200),
  role: z.enum(["admin", "teknisi", "sales", "magang"])
});

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function roleFromForm(formData: FormData): User["role"] {
  const role = text(formData, "role");
  if (role === "teknisi") return "teknisi";
  if (role === "sales") return "sales";
  if (role === "magang") return "magang";
  return "admin";
}

function roleFromCsv(value: string): User["role"] {
  const role = value.trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "teknisi") return "teknisi";
  if (role === "sales") return "sales";
  return "magang";
}

function csvDelimiter(input: string) {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
}

function csvRows(input: string) {
  const delimiter = csvDelimiter(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function isUploadedTextFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "size" in value &&
      "text" in value &&
      typeof value.text === "function"
  );
}

async function isLastActiveAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, active: true } });
  if (!user || user.role !== "ADMIN" || !user.active) return false;
  const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
  return activeAdmins <= 1;
}

export async function createUserAction(formData: FormData) {
  await requireRole(["admin"]);
  const validation = userFormSchema.extend({ password: z.string().min(8).max(200) }).safeParse(formValues(formData));
  if (!validation.success) redirect("/users?error=invalid-input");

  const name = text(formData, "name");
  const username = text(formData, "username").toLowerCase();
  const password = text(formData, "password");
  const role = roleFromForm(formData);
  const email = text(formData, "email") || `${username}@fscomp.local`;

  if (!name || !username || !password) {
    redirect("/users?error=required");
  }
  if (password.length < 8) redirect("/users?error=password-short");

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    },
    select: { id: true }
  });

  if (existing) {
    redirect("/users?error=duplicate");
  }

  await prisma.user.create({
    data: {
      name,
      username,
      password: await hashPassword(password),
      email,
      role: roleToDb(role),
      active: true
    }
  });

  revalidatePath("/users");
  redirect("/users?success=created");
}

export async function importUsersCsvAction(formData: FormData) {
  await requireRole(["admin"]);

  const file = formData.get("csvFile");
  if (!isUploadedTextFile(file) || file.size === 0 || file.size > 5_000_000) {
    redirect("/users?error=csv-required");
  }

  const rows = csvRows(await file.text());
  const [headers, ...dataRows] = rows;
  if (!headers?.length || dataRows.length === 0) {
    redirect("/users?error=csv-empty");
  }

  const headerIndex = new Map(headers.map((header, index) => [normalizeHeader(header), index]));
  const pick = (row: string[], key: string) => row[headerIndex.get(key) ?? -1]?.trim() ?? "";
  let imported = 0;

  for (const row of dataRows) {
    const username = pick(row, "username").toLowerCase();
    const email = pick(row, "email").toLowerCase();
    const name = pick(row, "nama") || username || email;
    const password = pick(row, "password baru") || pick(row, "password");
    const role = roleFromCsv(pick(row, "role"));
    const status = pick(row, "status").toLowerCase();
    const active = status ? status === "aktif" || status === "active" : true;

    if (!name || (!username && !email)) continue;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email }] : [])
        ]
      },
      select: { id: true, password: true }
    });

    if (password && password.length < 8) continue;
    const finalPassword = password ? await hashPassword(password) : existing?.password || "";
    if (active && (!username || !finalPassword)) continue;

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          username: username || null,
          email: email || `${username}@fscomp.local`,
          password: finalPassword || null,
          role: roleToDb(role),
          active
        }
      });
      imported += 1;
      continue;
    }

    if (!username || !finalPassword) continue;
    await prisma.user.create({
      data: {
        name,
        username,
        email: email || `${username}@fscomp.local`,
        password: finalPassword,
        role: roleToDb(role),
        active
      }
    });
    imported += 1;
  }

  revalidatePath("/users");
  redirect(`/users?success=imported&count=${imported}`);
}

export async function updateUserAction(userId: string, formData: FormData) {
  await requireRole(["admin"]);
  if (!entityId.safeParse(userId).success || !userFormSchema.safeParse(formValues(formData)).success) {
    redirect(`/users/${userId}/edit?error=invalid-input`);
  }

  const name = text(formData, "name");
  const username = text(formData, "username").toLowerCase();
  const password = text(formData, "password");
  const role = roleFromForm(formData);
  const email = text(formData, "email") || `${username}@fscomp.local`;
  const active = text(formData, "active") === "on";

  if (!name || !username) {
    redirect(`/users/${userId}/edit?error=required`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  });

  if (!existingUser) {
    redirect("/users?error=required");
  }

  if (password && password.length < 8) redirect(`/users/${userId}/edit?error=password-short`);
  const finalPassword = password ? await hashPassword(password) : existingUser.password || "";
  if (active && !finalPassword) {
    redirect(`/users/${userId}/edit?error=password-required`);
  }

  if (!active && (await isLastActiveAdmin(userId))) {
    redirect(`/users/${userId}/edit?error=last-admin`);
  }

  const duplicate = await prisma.user.findFirst({
    where: {
      NOT: { id: userId },
      OR: [{ username }, { email }]
    },
    select: { id: true }
  });

  if (duplicate) {
    redirect(`/users/${userId}/edit?error=duplicate`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      username,
      email,
      role: roleToDb(role),
      active,
      password: finalPassword
    }
  });

  revalidatePath("/users");
  redirect("/users?success=updated");
}

export async function deactivateUserAction(userId: string) {
  await requireRole(["admin"]);
  if (!entityId.safeParse(userId).success) redirect("/users?error=invalid-input");

  if (await isLastActiveAdmin(userId)) {
    redirect("/users?error=last-admin");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: false }
  });

  revalidatePath("/users");
  redirect("/users?success=disabled");
}

export async function activateUserAction(userId: string) {
  await requireRole(["admin"]);
  if (!entityId.safeParse(userId).success) redirect("/users?error=invalid-input");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, password: true }
  });

  if (!user?.username || !user.password) {
    redirect(`/users/${userId}/edit?error=password-required`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: true }
  });

  revalidatePath("/users");
  redirect("/users?success=activated");
}
