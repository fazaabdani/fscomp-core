import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: "https://core.fscomp.id/katalog", lastModified, changeFrequency: "daily", priority: 1 },
    { url: "https://core.fscomp.id/katalog/rakit-pc", lastModified, changeFrequency: "daily", priority: 0.9 }
  ];
}
