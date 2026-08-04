import type {
  WaConversationStatus,
  WaCustomerAiPolicy,
  WaLeadScore,
  WaRiskLevel
} from "@prisma/client";

export type WaAiIntent =
  | "GREETING"
  | "CATALOG"
  | "ADDRESS"
  | "HOURS"
  | "GENERAL_SERVICE"
  | "STOCK_SIMPLE"
  | "HOT_LEAD"
  | "PAYMENT"
  | "NEGOTIATION"
  | "COMPLAINT"
  | "WARRANTY"
  | "REFUND"
  | "ADMIN_REQUEST"
  | "UNKNOWN";

export type WaAiPolicyInput = {
  customerPolicy: WaCustomerAiPolicy;
  status: WaConversationStatus;
  leadScore: WaLeadScore;
  riskLevel: WaRiskLevel;
  intent: WaAiIntent;
  aiTakeoverAllowed: boolean;
  lastAdminResponseAt?: Date | null;
  now?: Date;
  settings?: {
    outsideHoursMessageEnabled?: boolean;
    active24Hours?: boolean;
    operationalHours?: StoreOperationalHours;
  };
};

export type WaAiPolicyDecision = {
  action: "AUTO_REPLY" | "BRIDGE_AND_HANDOVER" | "HANDOVER_ADMIN" | "BLOCK_AI";
  nextStatus?: WaConversationStatus;
  notifyAdmin: boolean;
  allowSafeCatalog: boolean;
  outsideOperationalHours: boolean;
  reason: string;
};

export type StoreOperationalHours = {
  timezone: string;
  days: Array<{ day: number; open: string; close: string }>;
};

const adminRequiredIntents = new Set<WaAiIntent>([
  "PAYMENT",
  "NEGOTIATION",
  "COMPLAINT",
  "WARRANTY",
  "REFUND",
  "ADMIN_REQUEST"
]);

const safeIntents = new Set<WaAiIntent>([
  "GREETING",
  "CATALOG",
  "ADDRESS",
  "HOURS",
  "STOCK_SIMPLE"
]);

export const defaultStoreOperationalHours: StoreOperationalHours = {
  timezone: "Asia/Jakarta",
  days: [
    { day: 1, open: "08:00", close: "21:00" },
    { day: 2, open: "08:00", close: "21:00" },
    { day: 3, open: "08:00", close: "21:00" },
    { day: 4, open: "08:00", close: "21:00" },
    { day: 5, open: "08:00", close: "21:00" },
    { day: 6, open: "08:00", close: "21:00" },
    { day: 0, open: "08:00", close: "21:00" }
  ]
};

function timeToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function datePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: dayMap[get("weekday")] ?? 0,
    minuteOfDay: Number(get("hour")) * 60 + Number(get("minute"))
  };
}

export function isWithinOperationalHours(date = new Date(), schedule = defaultStoreOperationalHours) {
  const current = datePartsInTimeZone(date, schedule.timezone);
  const today = schedule.days.find((item) => item.day === current.day);
  if (!today) return false;

  const open = timeToMinutes(today.open);
  const close = timeToMinutes(today.close);

  if (open === close) return true;
  if (open < close) return current.minuteOfDay >= open && current.minuteOfDay <= close;
  return current.minuteOfDay >= open || current.minuteOfDay <= close;
}

export function decideWaAiPolicy(input: WaAiPolicyInput): WaAiPolicyDecision {
  const schedule = input.settings?.operationalHours ?? defaultStoreOperationalHours;
  const outsideOperationalHours = !isWithinOperationalHours(input.now ?? new Date(), schedule);

  if (input.customerPolicy === "BLOCKED_AI") {
    return {
      action: "BLOCK_AI",
      notifyAdmin: false,
      allowSafeCatalog: false,
      outsideOperationalHours,
      reason: "customer_policy_blocked"
    };
  }

  if (input.customerPolicy === "ADMIN_ONLY" || input.customerPolicy === "VIP_ADMIN_ONLY") {
    return {
      action: "HANDOVER_ADMIN",
      nextStatus: "WAITING_ADMIN",
      notifyAdmin: true,
      allowSafeCatalog: false,
      outsideOperationalHours,
      reason: "customer_policy_admin_only"
    };
  }

  if (input.status === "WAITING_ADMIN" || input.status === "PENDING_ADMIN") {
    return {
      action: "HANDOVER_ADMIN",
      nextStatus: input.status,
      notifyAdmin: input.status === "WAITING_ADMIN",
      allowSafeCatalog: false,
      outsideOperationalHours,
      reason: "conversation_waiting_admin"
    };
  }

  if (input.lastAdminResponseAt && !input.aiTakeoverAllowed) {
    return {
      action: "HANDOVER_ADMIN",
      nextStatus: "WAITING_ADMIN",
      notifyAdmin: false,
      allowSafeCatalog: false,
      outsideOperationalHours,
      reason: "admin_already_responded"
    };
  }

  if (input.riskLevel === "RISK" || adminRequiredIntents.has(input.intent)) {
    return {
      action: "HANDOVER_ADMIN",
      nextStatus: "WAITING_ADMIN",
      notifyAdmin: true,
      allowSafeCatalog: false,
      outsideOperationalHours,
      reason: input.riskLevel === "RISK" ? "risk_detected" : "admin_required_intent"
    };
  }

  if (input.leadScore === "HOT" || input.intent === "HOT_LEAD") {
    return {
      action: "BRIDGE_AND_HANDOVER",
      nextStatus: "WAITING_ADMIN",
      notifyAdmin: true,
      allowSafeCatalog: false,
      outsideOperationalHours,
      reason: "hot_lead"
    };
  }

  if (input.customerPolicy === "AUTO_SAFE" && input.intent === "GENERAL_SERVICE") {
    return {
      action: "AUTO_REPLY",
      nextStatus: "PENDING_ADMIN",
      notifyAdmin: true,
      allowSafeCatalog: false,
      outsideOperationalHours,
      reason: outsideOperationalHours ? "safe_auto_reply_outside_hours" : "general_service_inquiry"
    };
  }

  if (input.customerPolicy === "AUTO_SAFE" && safeIntents.has(input.intent)) {
    return {
      action: "AUTO_REPLY",
      nextStatus: "OPEN",
      notifyAdmin: false,
      allowSafeCatalog: input.intent === "CATALOG" || input.intent === "STOCK_SIMPLE",
      outsideOperationalHours,
      reason: outsideOperationalHours ? "safe_auto_reply_outside_hours" : "safe_auto_reply"
    };
  }

  return {
    action: "HANDOVER_ADMIN",
    nextStatus: "PENDING_ADMIN",
    notifyAdmin: true,
    allowSafeCatalog: false,
    outsideOperationalHours,
    reason: "unknown_or_unsafe"
  };
}

export function inferWaAiIntent(message: string): WaAiIntent {
  const text = message.toLowerCase();
  if (/(admin|manusia|cs|orangnya|operator)/.test(text)) return "ADMIN_REQUEST";
  if (/(marah|kecewa|refund|balikin uang|uang kembali)/.test(text)) return "REFUND";
  if (/(komplain|rusak|bermasalah|tidak normal|mati|error)/.test(text)) return "COMPLAINT";
  if (/(garansi|klaim)/.test(text)) return "WARRANTY";
  if (/(servis|service|rakit pc|rakit komputer|reparasi|perbaikan)/.test(text)) return "GENERAL_SERVICE";
  if (/(rekening|transfer|dp|booking|bayar|pembayaran)/.test(text)) return "PAYMENT";
  if (/(nego|diskon|kurang|net|pasnya)/.test(text)) return "NEGOTIATION";
  if (/(jadi ambil|mau ambil|deal|fix|langsung ambil)/.test(text)) return "HOT_LEAD";
  if (/(stok|ready|ada unit|tersedia)/.test(text)) return "STOCK_SIMPLE";
  if (/(katalog|laptop|produk|rekomendasi|budget)/.test(text)) return "CATALOG";
  if (/(alamat|lokasi|maps|toko)/.test(text)) return "ADDRESS";
  if (/(jam buka|buka jam|tutup jam|hari ini buka)/.test(text)) return "HOURS";
  if (/(halo|hai|assalam|pagi|siang|sore|malam)/.test(text)) return "GREETING";
  return "UNKNOWN";
}
