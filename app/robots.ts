import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Foto unit disajikan dari /api/media/file/; aturan Allow yang lebih spesifik mengalahkan Disallow /api/,
      // supaya Google bisa mengambil gambar produk untuk hasil pencarian dan JSON-LD.
      allow: ["/katalog", "/katalog/rakit-pc", "/katalog/pc", "/unit", "/api/media/file/"],
      disallow: ["/api/", "/login", "/register", "/users", "/finance", "/inventory", "/sales", "/batch-psi", "/qc-harian", "/qc-tools"]
    },
    sitemap: "https://core.fscomp.id/sitemap.xml"
  };
}
