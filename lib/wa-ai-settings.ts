import type { WaCustomerAiPolicy } from "@prisma/client";
import { defaultStoreOperationalHours, type StoreOperationalHours } from "./wa-ai-policy";

export type WaAiRuntimeSettings = {
  aiEnabled: boolean;
  safeAutoReplyOnly: boolean;
  pendingOnly: boolean;
  followupPassive: boolean;
  active24Hours: boolean;
  outsideHoursMessageEnabled: boolean;
  productSource: "core_catalog";
  newCustomerPolicy: WaCustomerAiPolicy;
  knownCustomerPolicyAfterDeal: WaCustomerAiPolicy;
  operationalHours: StoreOperationalHours;
};

export const defaultWaAiRuntimeSettings: WaAiRuntimeSettings = {
  aiEnabled: true,
  safeAutoReplyOnly: true,
  pendingOnly: false,
  followupPassive: false,
  active24Hours: true,
  outsideHoursMessageEnabled: true,
  productSource: "core_catalog",
  newCustomerPolicy: "AUTO_SAFE",
  knownCustomerPolicyAfterDeal: "ADMIN_ONLY",
  operationalHours: defaultStoreOperationalHours
};
