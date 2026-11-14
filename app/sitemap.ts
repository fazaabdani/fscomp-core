import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Sitemap dibuat saat diminta (bukan saat build) supaya unit baru/terjual langsung ikut berubah.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: "https://core.fscomp.id/katalog", lastModified, changeFrequency: "daily", priority: 1 },
    { url: "https://core.fscomp.id/katalog/rakit-pc", lastModified, changeFrequency: "daily", priority: 0.9 }
  ];

  try {
    // Syarat yang sama dengan getCatalogPageData: hanya unit yang benar-benar tampil di /katalog
    // (terverifikasi, belum terjual, QC harian terakhir ada dan tidak "TIDAK_LOLOS"). Tanpa query string.
    const units = await prisma.unit.findMany({
      where: { soldAt: null, statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] } },
      select: {
        id: true,
        updatedAt: true,
        qcHarian: { orderBy: { tanggal: "desc" }, take: 1, select: { masihLolos: true } }
      }
    });

    const unitEntries: MetadataRoute.Sitemap = units
      .filter((unit) => Boolean(unit.qcHarian[0] && unit.qcHarian[0].masihLolos !== "TIDAK_LOLOS"))
      .map((unit) => ({
        url: `https://core.fscomp.id/unit/${unit.id}`,
        lastModified: unit.updatedAt,
        changeFrequency: "daily",
        priority: 0.7
      }));

    return [...base, ...unitEntries];
  } catch {
    return base;
  }
}
