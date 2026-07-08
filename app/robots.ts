import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/katalog", "/katalog/rakit-pc", "/unit/"],
      disallow: ["/api/", "/login", "/register", "/users", "/finance", "/inventory", "/sales", "/batch-psi", "/qc-harian", "/qc-tools"]
    },
    sitemap: "https://core.fscomp.id/sitemap.xml"
  };
}
