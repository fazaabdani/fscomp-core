import { prisma } from "./prisma";
import { FILTER_KEYS } from "./catalog-analytics";

export const PERIOD_OPTIONS = [7, 30, 90] as const;

export function parsePeriod(raw: string | undefined) {
  const value = Number(raw);
  return (PERIOD_OPTIONS as readonly number[]).includes(value) ? value : 30;
}

// Semua agregasi dihitung di database (hari memakai zona Jakarta). Nilai selalu lewat parameter; nama kolom filter
// hanya berasal dari daftar tetap FILTER_KEYS.
export async function getCatalogAnalytics(days: number) {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const [firstEvent, totals, daily, sources, devices, hours, topUnitRows, queries, zeroResults, soldRows] = await Promise.all([
    prisma.catalogEvent.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.$queryRawUnsafe<
      { visitors: number; sessions: number; pageviews: number; unit_views: number; wa_clicks: number; sessions_unit: number; sessions_wa: number; returning_visitors: number }[]
    >(
      `SELECT
         count(DISTINCT "visitorId")::int AS visitors,
         count(DISTINCT "sessionId")::int AS sessions,
         count(*) FILTER (WHERE type IN ('PAGEVIEW','UNIT_VIEW'))::int AS pageviews,
         count(*) FILTER (WHERE type = 'UNIT_VIEW')::int AS unit_views,
         count(*) FILTER (WHERE type = 'WA_CLICK')::int AS wa_clicks,
         count(DISTINCT "sessionId") FILTER (WHERE type = 'UNIT_VIEW')::int AS sessions_unit,
         count(DISTINCT "sessionId") FILTER (WHERE type = 'WA_CLICK')::int AS sessions_wa,
         (SELECT count(*)::int FROM (
            SELECT "visitorId" FROM "CatalogEvent" WHERE "createdAt" >= $1 GROUP BY 1 HAVING count(DISTINCT "sessionId") > 1
         ) r) AS returning_visitors
       FROM "CatalogEvent" WHERE "createdAt" >= $1`,
      since
    ),
    prisma.$queryRawUnsafe<{ d: string; visitors: number; wa: number }[]>(
      `SELECT to_char("createdAt" AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS d,
              count(DISTINCT "visitorId")::int AS visitors,
              count(*) FILTER (WHERE type = 'WA_CLICK')::int AS wa
       FROM "CatalogEvent" WHERE "createdAt" >= $1 GROUP BY 1 ORDER BY 1`,
      since
    ),
    prisma.$queryRawUnsafe<{ source: string; medium: string; sessions: number; wa: number }[]>(
      `SELECT COALESCE(source, '(direct)') AS source, COALESCE(medium, '-') AS medium,
              count(DISTINCT "sessionId")::int AS sessions,
              count(DISTINCT "sessionId") FILTER (WHERE type = 'WA_CLICK')::int AS wa
       FROM "CatalogEvent" WHERE "createdAt" >= $1 GROUP BY 1, 2 ORDER BY sessions DESC, wa DESC LIMIT 12`,
      since
    ),
    prisma.$queryRawUnsafe<{ device: string; sessions: number; wa: number }[]>(
      `SELECT COALESCE(device, 'unknown') AS device, count(DISTINCT "sessionId")::int AS sessions,
              count(DISTINCT "sessionId") FILTER (WHERE type = 'WA_CLICK')::int AS wa
       FROM "CatalogEvent" WHERE "createdAt" >= $1 GROUP BY 1 ORDER BY sessions DESC`,
      since
    ),
    prisma.$queryRawUnsafe<{ h: number; sessions: number; wa: number }[]>(
      `SELECT extract(hour FROM "createdAt" AT TIME ZONE 'Asia/Jakarta')::int AS h,
              count(DISTINCT "sessionId")::int AS sessions,
              count(*) FILTER (WHERE type = 'WA_CLICK')::int AS wa
       FROM "CatalogEvent" WHERE "createdAt" >= $1 GROUP BY 1 ORDER BY 1`,
      since
    ),
    prisma.$queryRawUnsafe<{ unitId: string; views: number; wa: number }[]>(
      `SELECT "unitId",
              count(DISTINCT "sessionId") FILTER (WHERE type = 'UNIT_VIEW')::int AS views,
              count(*) FILTER (WHERE type = 'WA_CLICK')::int AS wa
       FROM "CatalogEvent" WHERE "unitId" IS NOT NULL AND "createdAt" >= $1
       GROUP BY 1 ORDER BY views DESC, wa DESC LIMIT 20`,
      since
    ),
    prisma.$queryRawUnsafe<{ query: string; c: number; avg_results: number | null; zero: number }[]>(
      `SELECT "query", count(*)::int AS c, round(avg("resultCount"))::int AS avg_results,
              count(*) FILTER (WHERE "resultCount" = 0)::int AS zero
       FROM "CatalogEvent" WHERE type = 'SEARCH' AND "query" IS NOT NULL AND "query" <> '' AND "createdAt" >= $1
       GROUP BY 1 ORDER BY c DESC LIMIT 15`,
      since
    ),
    prisma.$queryRawUnsafe<{ q: string; filters: string | null; c: number }[]>(
      `SELECT COALESCE(NULLIF("query", ''), '(hanya filter)') AS q, filters, count(*)::int AS c
       FROM "CatalogEvent" WHERE type = 'SEARCH' AND "resultCount" = 0 AND "createdAt" >= $1
       GROUP BY 1, 2 ORDER BY c DESC LIMIT 15`,
      since
    ),
    prisma.$queryRawUnsafe<{ id: string; nomorUnit: string; model: string; soldAt: Date; tanggalMasuk: Date; views: number; wa: number }[]>(
      `SELECT u."id", u."nomorUnit", u."model", u."soldAt", u."tanggalMasuk",
              count(DISTINCT e."sessionId") FILTER (WHERE e.type = 'UNIT_VIEW' AND e."createdAt" < u."soldAt")::int AS views,
              count(e."id") FILTER (WHERE e.type = 'WA_CLICK' AND e."createdAt" < u."soldAt")::int AS wa
       FROM "Unit" u LEFT JOIN "CatalogEvent" e ON e."unitId" = u."id"
       WHERE u."soldAt" >= $1 GROUP BY u."id" ORDER BY u."soldAt" DESC LIMIT 200`,
      since
    )
  ]);

  // Popularitas tiap filter (hanya dari pencarian yang benar-benar memakai filter itu).
  const filterPopularity: Record<string, { value: string; c: number }[]> = {};
  for (const key of FILTER_KEYS) {
    if (key === "sort" || key === "view") continue;
    filterPopularity[key] = await prisma.$queryRawUnsafe<{ value: string; c: number }[]>(
      `SELECT filters::jsonb ->> '${key}' AS value, count(*)::int AS c
       FROM "CatalogEvent" WHERE type = 'SEARCH' AND filters IS NOT NULL AND filters::jsonb ->> '${key}' IS NOT NULL AND "createdAt" >= $1
       GROUP BY 1 ORDER BY c DESC LIMIT 6`,
      since
    );
  }

  const units = topUnitRows.length
    ? await prisma.unit.findMany({
        where: { id: { in: topUnitRows.map((row) => row.unitId) } },
        select: { id: true, nomorUnit: true, model: true, hargaJualRekomendasi: true, soldAt: true, statusObservasi: true, stockLocation: true }
      })
    : [];
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const topUnits = topUnitRows.map((row) => ({ ...row, unit: unitById.get(row.unitId) ?? null }));

  const sold = soldRows.map((row) => {
    const dayMs = 24 * 3600 * 1000;
    const daysListed = Math.max(0, Math.round((row.soldAt.getTime() - row.tanggalMasuk.getTime()) / dayMs));
    return { ...row, daysListed: daysListed > 3000 ? null : daysListed };
  });

  return {
    days,
    dataSince: firstEvent?.createdAt ?? null,
    totals: totals[0],
    daily,
    sources,
    devices,
    hours,
    topUnits,
    queries,
    zeroResults,
    filterPopularity,
    sold,
    eventCount: await prisma.catalogEvent.count({ where: { createdAt: { gte: since } } })
  };
}

export type CatalogAnalytics = Awaited<ReturnType<typeof getCatalogAnalytics>>;
