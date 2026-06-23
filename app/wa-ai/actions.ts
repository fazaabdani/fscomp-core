"use server";

import type { WaConversationStatus, WaCustomerAiPolicy } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { entityId, formValues, z } from "@/lib/form-validation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const conversationStatusSchema = z.enum(["OPEN", "PENDING_ADMIN", "WAITING_ADMIN", "CLOSED", "DEAL", "LOST", "ARCHIVED"]);
const customerPolicySchema = z.enum(["AUTO_SAFE", "ADMIN_ONLY", "VIP_ADMIN_ONLY", "BLOCKED_AI"]);

function boolFromForm(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export async function updateWaConversationAction(conversationId: string, formData: FormData) {
  const currentUser = requireRole(["admin", "sales"]);
  const validation = z.object({
    status: conversationStatusSchema,
    aiTakeoverAllowed: z.string().optional()
  }).safeParse(formValues(formData));

  if (!entityId.safeParse(conversationId).success || !validation.success) {
    redirect("/wa-ai?error=invalid-input");
  }

  const status = validation.data.status as WaConversationStatus;
  const aiTakeoverAllowed = boolFromForm(formData.get("aiTakeoverAllowed"));

  const conversation = await prisma.waConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, status: true, aiTakeoverAllowed: true }
  });

  if (!conversation) redirect("/wa-ai?error=not-found");

  await prisma.$transaction([
    prisma.waConversation.update({
      where: { id: conversationId },
      data: {
        status,
        aiTakeoverAllowed,
        ...(status === "OPEN" && aiTakeoverAllowed ? { lastAdminResponseAt: null } : {})
      }
    }),
    prisma.waAiEventLog.create({
      data: {
        conversationId,
        eventType: "ADMIN_CONVERSATION_UPDATE",
        status: "INFO",
        reason: `updated_by_${currentUser.username}`,
        payload: {
          previousStatus: conversation.status,
          nextStatus: status,
          previousAiTakeoverAllowed: conversation.aiTakeoverAllowed,
          nextAiTakeoverAllowed: aiTakeoverAllowed
        }
      }
    })
  ]);

  revalidatePath("/wa-ai");
  redirect("/wa-ai?success=conversation-updated");
}

export async function updateWaCustomerPolicyAction(customerId: string, formData: FormData) {
  const currentUser = requireRole(["admin", "sales"]);
  const validation = z.object({
    customerAiPolicy: customerPolicySchema
  }).safeParse(formValues(formData));

  if (!entityId.safeParse(customerId).success || !validation.success) {
    redirect("/wa-ai?error=invalid-input");
  }

  const customerAiPolicy = validation.data.customerAiPolicy as WaCustomerAiPolicy;
  const customer = await prisma.waCustomer.findUnique({
    where: { id: customerId },
    select: { id: true, customerAiPolicy: true, conversations: { select: { id: true }, orderBy: { updatedAt: "desc" }, take: 1 } }
  });

  if (!customer) redirect("/wa-ai?error=not-found");

  const latestConversationId = customer.conversations[0]?.id;

  await prisma.$transaction([
    prisma.waCustomer.update({
      where: { id: customerId },
      data: { customerAiPolicy }
    }),
    prisma.waAiEventLog.create({
      data: {
        conversationId: latestConversationId ?? null,
        eventType: "ADMIN_CUSTOMER_POLICY_UPDATE",
        status: "INFO",
        reason: `updated_by_${currentUser.username}`,
        payload: {
          customerId,
          previousCustomerAiPolicy: customer.customerAiPolicy,
          nextCustomerAiPolicy: customerAiPolicy
        }
      }
    })
  ]);

  revalidatePath("/wa-ai");
  redirect("/wa-ai?success=policy-updated");
}
