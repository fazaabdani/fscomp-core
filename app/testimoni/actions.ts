"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { entityId, formValues, requiredText, z } from "@/lib/form-validation";

export async function createTestimonialAction(formData: FormData) {
  const currentUser = await requireRole(["admin"]);

  const validation = z.object({
    buyerName: requiredText(150),
    quote: requiredText(600),
    rating: z.coerce.number().int().min(1).max(5)
  }).safeParse(formValues(formData));

  if (!validation.success) redirect("/testimoni?error=invalid-input");

  const dbUser = await prisma.user.findFirst({ where: { username: currentUser.username }, select: { id: true } });

  await prisma.testimonial.create({
    data: {
      buyerName: validation.data.buyerName,
      quote: validation.data.quote,
      rating: validation.data.rating,
      published: true,
      createdById: dbUser?.id ?? null
    }
  });

  revalidatePath("/testimoni");
  revalidatePath("/katalog");
  redirect("/testimoni?success=testimonial-added");
}

export async function togglePublishedAction(id: string, formData: FormData) {
  await requireRole(["admin"]);
  if (!entityId.safeParse(id).success) redirect("/testimoni?error=invalid-input");

  const next = formData.get("published") === "true";
  await prisma.testimonial.update({ where: { id }, data: { published: next } });

  revalidatePath("/testimoni");
  revalidatePath("/katalog");
  redirect("/testimoni?success=testimonial-updated");
}

export async function deleteTestimonialAction(id: string) {
  await requireRole(["admin"]);
  if (!entityId.safeParse(id).success) redirect("/testimoni?error=invalid-input");

  await prisma.testimonial.delete({ where: { id } });

  revalidatePath("/testimoni");
  revalidatePath("/katalog");
  redirect("/testimoni?success=testimonial-deleted");
}
