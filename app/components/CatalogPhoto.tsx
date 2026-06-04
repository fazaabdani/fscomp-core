"use client";

import { useMemo, useState } from "react";
import { catalogImageCandidates, genericCatalogImageCandidates } from "@/lib/catalog-image";

export function CatalogPhoto({
  url,
  alt,
  className,
  placeholderClassName = "catalogImagePlaceholder"
}: {
  url?: string | null;
  alt: string;
  className: string;
  placeholderClassName?: string;
}) {
  const isIllustration = !url;
  const candidates = useMemo(() => (url ? catalogImageCandidates(url) : genericCatalogImageCandidates), [url]);
  const [index, setIndex] = useState(0);

  if (candidates.length === 0 || index >= candidates.length) {
    return (
      <div className={placeholderClassName}>
        <strong>FS</strong>
        <span>Foto menyusul</span>
      </div>
    );
  }

  const image = (
    <img
      className={className}
      src={candidates[index]}
      alt={isIllustration ? `${alt} ilustrasi` : alt}
      referrerPolicy="no-referrer"
      style={isIllustration ? { width: "100%", height: "100%", border: 0, borderRadius: 0, objectFit: "cover" } : undefined}
      onError={() => setIndex((current) => current + 1)}
    />
  );

  if (!isIllustration) return image;

  return (
    <div className={className} style={{ position: "relative", display: "block", overflow: "hidden" }}>
      {image}
      <span
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          padding: "5px 8px",
          borderRadius: 6,
          background: "rgba(3, 10, 22, 0.82)",
          color: "#e6f1ff",
          fontSize: 12,
          fontWeight: 800
        }}
      >
        Foto ilustrasi
      </span>
    </div>
  );
}
