// Peringatan lead Fesi -> Telegram admin. MURNI (validasi + susun pesan) supaya mudah diuji.
// Prinsip privasi: tidak ada nama/nomor HP pengunjung; hanya kebutuhan, budget, unit yang dilihat, dan jam.
import { CLIENT_ID, UNIT_ID } from "./catalog-analytics";
import { BUDGETS, FAQS, NEEDS, rupiah } from "./fesi";

export const SITE = "https://core.fscomp.id";

export type LeadKind = "unit" | "admin";

export type CleanLead = {
  sessionId: string;
  kind: LeadKind;
  need: string | null;
  budget: string | null;
  clickedUnitId: string | null;
  shownUnitIds: string[];
  faqTopics: string[];
  device: "mobile" | "tablet" | "desktop" | null;
  test: boolean;
};

const NEED_IDS: readonly string[] = NEEDS.map((n) => n.id);
const BUDGET_IDS: readonly string[] = BUDGETS.map((b) => b.id);
const FAQ_IDS: readonly string[] = FAQS.map((f) => f.id);

/** Payload dari browser dianggap tidak tepercaya: hanya nilai yang dikenal yang diloloskan. */
export function sanitizeLead(raw: unknown): CleanLead | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sessionId = typeof r.sid === "string" && CLIENT_ID.test(r.sid) ? r.sid : null;
  if (!sessionId) return null;
  const kind: LeadKind = r.kind === "unit" ? "unit" : "admin";
  const need = typeof r.need === "string" && NEED_IDS.includes(r.need) ? r.need : null;
  const budget = typeof r.budget === "string" && BUDGET_IDS.includes(r.budget) ? r.budget : null;
  const clickedUnitId = typeof r.unitId === "string" && UNIT_ID.test(r.unitId) ? r.unitId : null;
  if (kind === "unit" && !clickedUnitId) return null;
  const shownUnitIds = Array.isArray(r.shown)
    ? Array.from(new Set(r.shown.filter((x): x is string => typeof x === "string" && UNIT_ID.test(x)))).slice(0, 3)
    : [];
  const faqTopics = Array.isArray(r.faq) ? Array.from(new Set(r.faq.filter((x): x is string => typeof x === "string" && FAQ_IDS.includes(x)))).slice(0, 5) : [];
  const device = r.device === "mobile" || r.device === "tablet" || r.device === "desktop" ? r.device : null;
  return { sessionId, kind, need, budget, clickedUnitId, shownUnitIds, faqTopics, device, test: sessionId.startsWith("tes-") };
}

export type LeadUnit = { id: string; nomorUnit: string; model: string; price: number; lokasi: string };

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const unitLine = (u: LeadUnit) =>
  `<a href="${SITE}/unit/${u.id}">${escapeHtml(u.nomorUnit)} · ${escapeHtml(u.model)}</a> (${rupiah(u.price)}, ${escapeHtml(u.lokasi)})`;

export function wibClock(date: Date) {
  const parts = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(date);
  return `${parts.replace(":", ".")} WIB`;
}

/** Toko buka 09.00 sampai 17.00 WIB; di luar itu pelanggan diarahkan janjian dan alert tidak berbunyi. */
export function isOpenHours(date: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" }).format(date));
  return hour >= 9 && hour < 17;
}

export function buildLeadMessage(lead: CleanLead, units: LeadUnit[], now = new Date()) {
  const byId = new Map(units.map((u) => [u.id, u]));
  const clicked = lead.clickedUnitId ? byId.get(lead.clickedUnitId) : undefined;
  const shown = lead.shownUnitIds.map((id) => byId.get(id)).filter((u): u is LeadUnit => Boolean(u));
  const need = NEEDS.find((n) => n.id === lead.need)?.label;
  const budget = BUDGETS.find((b) => b.id === lead.budget);
  const faq = lead.faqTopics.map((id) => FAQS.find((f) => f.id === id)?.label).filter(Boolean);
  const device = lead.device === "mobile" ? "HP" : lead.device === "tablet" ? "Tablet" : lead.device === "desktop" ? "Komputer" : null;

  const lines = [
    `${lead.test ? "🧪 [TES] " : "🔔 "}<b>Calon pembeli dari Fesi</b>`,
    lead.kind === "unit" ? "Baru klik <b>Tanya via WA</b> untuk unit di bawah. Chat bisa masuk sebentar lagi, siap-siap balas ya!" : "Baru klik <b>Chat admin</b>. Chat bisa masuk sebentar lagi, siap-siap balas ya!",
    "",
    need ? `Kebutuhan: ${escapeHtml(need)}` : null,
    budget && budget.id !== "any" ? `Budget: ${escapeHtml(budget.label)}` : null,
    clicked ? `Unit ditanyakan: ${unitLine(clicked)}` : null,
    shown.length > 0 ? `Unit yang ditampilkan Fesi:\n${shown.map((u, i) => `${i + 1}. ${unitLine(u)}`).join("\n")}` : null,
    faq.length > 0 ? `Sempat tanya: ${faq.map((f) => escapeHtml(String(f))).join(", ")}` : null,
    isOpenHours(now) ? null : "🌙 Di luar jam buka (09.00–17.00). Tawarkan janjian ya.",
    [device, wibClock(now)].filter(Boolean).join(" · ")
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

/** Satu peringatan per sesi per tujuan dalam jendela waktu, supaya klik berulang tidak membanjiri admin. */
export function createLeadDeduper(windowMs: number) {
  const seen = new Map<string, number>();
  return (key: string, now = Date.now()) => {
    if (seen.size > 2000) seen.forEach((t, k) => { if (now - t > windowMs) seen.delete(k); });
    const last = seen.get(key);
    if (last !== undefined && now - last < windowMs) return false;
    seen.set(key, now);
    return true;
  };
}
