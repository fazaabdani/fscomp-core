import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const base: MetadataRoute.Sitemap = [
    { url: "https://core.fscomp.id/katalog", lastModified, changeFrequency: "daily", priority: 1 },
    { url: "https://core.fscomp.id/katalog/rakit-pc", lastModified, changeFrequency: "daily", priority: 0.9 }
  ];

  try {
    const units = await prisma.unit.findMany({
      where: { soldAt: null, statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] } },
      select: { id: true, updatedAt: true }
    });

    const unitEntries: MetadataRoute.Sitemap = units.map((unit) => ({
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
