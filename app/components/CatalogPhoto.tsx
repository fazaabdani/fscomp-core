"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { catalogImageCandidates, genericCatalogImageCandidates } from "@/lib/catalog-image";

export function CatalogPhoto({
  url,
  alt,
  className,
  placeholderClassName = "catalogImagePlaceholder",
  priority = false,
  zoomable = false,
  imageWidth = 1200
}: {
  url?: string | null;
  alt: string;
  className: string;
  placeholderClassName?: string;
  priority?: boolean;
  zoomable?: boolean;
  imageWidth?: number;
}) {
  const isIllustration = !url;
  const candidates = useMemo(() => (url ? catalogImageCandidates(url, imageWidth) : genericCatalogImageCandidates), [imageWidth, url]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const source = candidates[index];

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
    setExpanded(false);
  }, [imageWidth, url]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }

    window.addEventListener("keydown", closeFromEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeFromEscape);
    };
  }, [expanded]);

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
      src={source}
      alt={isIllustration ? `${alt} ilustrasi` : alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      data-loaded={loaded ? "true" : "false"}
      style={isIllustration ? { width: "100%", height: "100%", border: 0, borderRadius: 0, objectFit: "cover" } : undefined}
      onLoad={() => setLoaded(true)}
      onError={() => {
        setLoaded(false);
        setIndex((current) => current + 1);
      }}
    />
  );

  if (!isIllustration) {
    return (
      <>
        {zoomable ? (
          <button className="catalogPhotoZoomTrigger" type="button" onClick={() => setExpanded(true)} aria-label={`Perbesar ${alt}`}>
            {image}
            <span><Maximize2 size={17} /> Perbesar foto</span>
          </button>
        ) : image}
        {zoomable && expanded ? (
          <div className="catalogPhotoLightbox" role="dialog" aria-modal="true" aria-label={`Foto besar ${alt}`} onClick={() => setExpanded(false)}>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Tutup foto"><X size={24} /></button>
            <img src={source} alt={alt} referrerPolicy="no-referrer" onClick={(event) => event.stopPropagation()} />
          </div>
        ) : null}
      </>
    );
  }

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
