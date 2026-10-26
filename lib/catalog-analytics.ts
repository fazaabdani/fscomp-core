// Logika murni analitik katalog (tanpa database/Next) supaya mudah diuji dan dipakai di sisi browser maupun server.
// Prinsip privasi: tidak menyimpan IP, nama, atau nomor HP -- hanya id acak dari browser dan perilaku di katalog.

export const EVENT_TYPES = ["PAGEVIEW", "UNIT_VIEW", "WA_CLICK", "SEARCH"] as const;
export type CatalogEventType = (typeof EVENT_TYPES)[number];

export const FILTER_KEYS = ["lokasi", "merek", "processor", "ram", "storage", "windows", "touchscreen", "harga", "sort", "view"] as const;
// Nilai bawaan filter = bukan "pencarian aktif".
const FILTER_DEFAULTS: Record<string, string> = { lokasi: "semua", harga: "semua", sort: "unit", view: "grid" };

const UNIT_ID = /^c[a-z0-9]{20,32}$/;
const CLIENT_ID = /^[a-z0-9-]{8,48}$/i;
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|facebot|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|httpclient|axios|node-fetch|go-http|java\/|scrapy|phantom|selenium|puppeteer|playwright|whatsapp|telegrambot|discordbot|twitterbot|linkedinbot|bingpreview|google-read-aloud|chrome-lighthouse/i;

export function isBotUserAgent(userAgent: string | null | undefined) {
  if (!userAgent || userAgent.length < 10) return true;
  return BOT_UA.test(userAgent);
}

export function deviceOfWidth(width: number) {
  if (!Number.isFinite(width) || width <= 0) return "unknown";
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

export function hostOf(referrer: string | null | undefined, ownHost: string) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host && host !== ownHost.replace(/^www\./, "") ? host.slice(0, 60) : null;
  } catch {
    return null;
  }
}

/** Sumber trafik first-touch: utm_source > referrer > "(direct)". */
export function sourceOf(search: URLSearchParams, referrer: string | null | undefined, ownHost: string) {
  const utmSource = clean(search.get("utm_source"), 60);
  if (utmSource) return { source: utmSource.toLowerCase(), medium: clean(search.get("utm_medium"), 40)?.toLowerCase() ?? null, campaign: clean(search.get("utm_campaign"), 80)?.toLowerCase() ?? null };
  const ref = hostOf(referrer, ownHost);
  if (ref) return { source: ref, medium: "referral", campaign: null };
  return { source: "(direct)", medium: null, campaign: null };
}

/** Filter katalog yang sedang aktif (tanpa nilai bawaan), sebagai objek bersih. */
export function activeFilters(search: URLSearchParams) {
  const out: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = clean(search.get(key), 40);
    if (!value) continue;
    if (FILTER_DEFAULTS[key] === value) continue;
    out[key] = value.toLowerCase();
  }
  return out;
}

export function unitIdFromPath(path: string) {
  const match = path.match(/^\/unit\/([^/?#]+)/);
  return match && UNIT_ID.test(match[1]) ? match[1] : null;
}

export type CleanEvent = {
  type: CatalogEventType;
  visitorId: string;
  sessionId: string;
  path: string;
  unitId: string | null;
  label: string | null;
  query: string | null;
  filters: string | null;
  resultCount: number | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  device: string | null;
};

/**
 * Validasi + normalisasi payload dari browser. Mengembalikan null kalau harus ditolak
 * (tipe/jalur tidak valid, bot, atau staf yang sedang login). Endpoint publik, jadi SEMUA input dianggap tidak tepercaya.
 */
export function sanitizeEvent(raw: unknown, ctx: { userAgent: string | null | undefined; hasStaffSession: boolean }): CleanEvent | null {
  if (ctx.hasStaffSession || isBotUserAgent(ctx.userAgent)) return null;
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const type = (EVENT_TYPES as readonly string[]).includes(String(r.type)) ? (r.type as CatalogEventType) : null;
  if (!type) return null;
  const visitorId = typeof r.vid === "string" && CLIENT_ID.test(r.vid) ? r.vid : null;
  const sessionId = typeof r.sid === "string" && CLIENT_ID.test(r.sid) ? r.sid : null;
  if (!visitorId || !sessionId) return null;

  const path = clean(r.path, 200)?.split(/[?#]/)[0] ?? null;
  if (!path || !(path === "/katalog" || path.startsWith("/katalog/") || path.startsWith("/unit/"))) return null;

  const unitId = typeof r.unitId === "string" && UNIT_ID.test(r.unitId) ? r.unitId : unitIdFromPath(path);
  if ((type === "UNIT_VIEW") && !unitId) return null;

  let filters: string | null = null;
  if (r.filters && typeof r.filters === "object") {
    const picked: Record<string, string> = {};
    for (const key of FILTER_KEYS) {
      const value = clean((r.filters as Record<string, unknown>)[key], 40);
      if (value) picked[key] = value.toLowerCase();
    }
    if (Object.keys(picked).length > 0) filters = JSON.stringify(picked);
  }
  const resultCount = typeof r.resultCount === "number" && Number.isInteger(r.resultCount) && r.resultCount >= 0 && r.resultCount <= 5000 ? r.resultCount : null;
  const device = clean(r.device, 10);

  return {
    type,
    visitorId,
    sessionId,
    path,
    unitId,
    label: clean(r.label, 100),
    query: clean(r.query, 80)?.toLowerCase() ?? null,
    filters,
    resultCount,
    source: clean(r.source, 60)?.toLowerCase() ?? null,
    medium: clean(r.medium, 40)?.toLowerCase() ?? null,
    campaign: clean(r.campaign, 80)?.toLowerCase() ?? null,
    device: device && ["mobile", "tablet", "desktop", "unknown"].includes(device) ? device : null
  };
}

/** Pembatas laju sederhana di memori proses (cukup untuk menahan spam/loop; bukan keamanan mutlak). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; reset: number }>();
  return (key: string, now = Date.now()) => {
    if (hits.size > 5000) hits.forEach((value, mapKey) => { if (value.reset < now) hits.delete(mapKey); });
    const entry = hits.get(key);
    if (!entry || entry.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
