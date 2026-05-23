"use client";

import { useMemo, useState } from "react";
import { catalogImageCandidates } from "@/lib/catalog-image";

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
  const candidates = useMemo(() => catalogImageCandidates(url), [url]);
  const [index, setIndex] = useState(0);

  if (candidates.length === 0 || index >= candidates.length) {
    return (
      <div className={placeholderClassName}>
        <strong>FS</strong>
        <span>Foto menyusul</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={candidates[index]}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setIndex((current) => current + 1)}
    />
  );
}
