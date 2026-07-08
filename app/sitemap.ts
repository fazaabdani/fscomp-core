import type { MetadataRoute } from "next";
import { getCatalogPageData } from "@/lib/catalog-page-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: "https://core.fscomp.id/katalog", lastModified, changeFrequency: "daily", priority: 1 },
    { url: "https://core.fscomp.id/katalog/rakit-pc", lastModified, changeFrequency: "daily", priority: 0.9 }
  ];

  const { wiradesaUnits, kajenUnits } = await getCatalogPageData();
  const unitEntries: MetadataRoute.Sitemap = [...wiradesaUnits, ...kajenUnits].map((unit) => ({
    url: `https://core.fscomp.id/unit/${unit.id}`,
    lastModified,
    changeFrequency: "daily",
    priority: 0.7
  }));

  return [...staticEntries, ...unitEntries];
}
