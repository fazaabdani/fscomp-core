"use server";

import type { WaConversationStatus, WaCustomerAiPolicy } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { entityId, formValues, z } from "@/lib/form-validation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { waChannelIds, type WaChannelId } from "@/lib/wa-ai-channels";

const conversationStatusSchema = z.enum(["OPEN", "PENDING_ADMIN", "WAITING_ADMIN", "CLOSED", "DEAL", "LOST", "ARCHIVED"]);
const customerPolicySchema = z.enum(["AUTO_SAFE", "ADMIN_ONLY", "VIP_ADMIN_ONLY", "BLOCKED_AI"]);
const personaSchema = z.string().trim().min(1).max(20000);

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

export async function updateWaAiPersonaAction(formData: FormData) {
  const currentUser = requireRole(["admin", "sales"]);
  const validation = personaSchema.safeParse(formValues(formData).persona);

  if (!validation.success) {
    redirect("/wa-ai?error=invalid-input");
  }

  const previous = await prisma.waAiSetting.findUnique({ where: { key: "ai_sales_persona_prompt" } });

  await prisma.$transaction([
    prisma.waAiSetting.upsert({
      where: { key: "ai_sales_persona_prompt" },
      update: { value: validation.data },
      create: { key: "ai_sales_persona_prompt", value: validation.data }
    }),
    prisma.waAiEventLog.create({
      data: {
        eventType: "ADMIN_PERSONA_UPDATE",
        status: "INFO",
        reason: `updated_by_${currentUser.username}`,
        payload: {
          previousValue: previous?.value ?? null,
          nextValue: validation.data
        }
      }
    })
  ]);

  revalidatePath("/wa-ai");
  redirect("/wa-ai?success=persona-updated");
}

export async function updateWaAiChannelsAction(formData: FormData) {
  const currentUser = requireRole(["admin", "sales"]);
  const selected = formData.getAll("channels").filter((value): value is string => typeof value === "string");
  const nextChannels = selected.filter((value): value is WaChannelId => (waChannelIds as string[]).includes(value));

  const previous = await prisma.waAiSetting.findUnique({ where: { key: "active_wa_channels" } });

  await prisma.$transaction([
    prisma.waAiSetting.upsert({
      where: { key: "active_wa_channels" },
      update: { value: nextChannels },
      create: { key: "active_wa_channels", value: nextChannels }
    }),
    prisma.waAiEventLog.create({
      data: {
        eventType: "ADMIN_CHANNELS_UPDATE",
        status: "INFO",
        reason: `updated_by_${currentUser.username}`,
        payload: {
          previousValue: previous?.value ?? null,
          nextValue: nextChannels
        }
      }
    })
  ]);

  revalidatePath("/wa-ai");
  redirect("/wa-ai?success=channels-updated");
}

export async function updateWaAiEnabledAction(formData: FormData) {
  const currentUser = requireRole(["admin", "sales"]);
  const nextEnabled = boolFromForm(formData.get("aiEnabled"));

  const previous = await prisma.waAiSetting.findUnique({ where: { key: "ai_enabled" } });

  await prisma.$transaction([
    prisma.waAiSetting.upsert({
      where: { key: "ai_enabled" },
      update: { value: nextEnabled },
      create: { key: "ai_enabled", value: nextEnabled }
    }),
    prisma.waAiEventLog.create({
      data: {
        eventType: "ADMIN_AI_ENABLED_UPDATE",
        status: "INFO",
        reason: `updated_by_${currentUser.username}`,
        payload: {
          previousValue: previous?.value ?? null,
          nextValue: nextEnabled
        }
      }
    })
  ]);

  revalidatePath("/wa-ai");
  redirect(`/wa-ai?success=${nextEnabled ? "ai-enabled" : "ai-disabled"}`);
}
