"use client";

import { ChevronLeft, ChevronRight, Download, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type GalleryPhoto = { url: string; thumbUrl: string };

export function UnitGallery({
  photos,
  alt,
  className,
  placeholderClassName = "catalogImagePlaceholder",
  priority = false,
  downloadNamePrefix
}: {
  photos: GalleryPhoto[];
  alt: string;
  className: string;
  placeholderClassName?: string;
  priority?: boolean;
  /** Kalau diisi, tampilkan tombol unduh foto kualitas penuh dengan nama file "<prefix>-<nomor>.webp". */
  downloadNamePrefix?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const didSwipeRef = useRef(false);
  const photoCount = photos.length;

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
      if (photoCount > 1 && event.key === "ArrowLeft") setActiveIndex((current) => (current - 1 + photoCount) % photoCount);
      if (photoCount > 1 && event.key === "ArrowRight") setActiveIndex((current) => (current + 1) % photoCount);
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [expanded, photoCount]);

  if (photos.length === 0) {
    return (
      <div className={placeholderClassName}>
        <strong>FS</strong>
        <span>Foto menyusul</span>
      </div>
    );
  }

  function goTo(index: number) {
    setActiveIndex((index + photos.length) % photos.length);
  }

  function downloadFileName(index: number) {
    return `${downloadNamePrefix}-${index + 1}.webp`;
  }

  function handleTouchStart(event: React.TouchEvent) {
    setTouchStartX(event.touches[0].clientX);
    didSwipeRef.current = false;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (touchStartX === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      goTo(activeIndex + (deltaX < 0 ? 1 : -1));
      didSwipeRef.current = true;
    }
    setTouchStartX(null);
  }

  function handleZoomTriggerClick() {
    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }
    setExpanded(true);
  }

  return (
    <>
      <div className="galleryPhotoStage">
        <button
          type="button"
          className="catalogPhotoZoomTrigger"
          onClick={handleZoomTriggerClick}
          aria-label={`Perbesar ${alt}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img className={className} src={photos[activeIndex].url} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" />
          <span><Maximize2 size={17} /> Perbesar foto</span>
        </button>
        {downloadNamePrefix ? (
          <a
            className="secondaryButton galleryDownloadButton"
            href={photos[activeIndex].url}
            download={downloadFileName(activeIndex)}
            aria-label={`Unduh ${alt} kualitas penuh`}
          >
            <Download size={16} /> Unduh foto
          </a>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="mediaGrid">
          {photos.map((photo, index) => (
            <button
              type="button"
              className={`mediaThumb mediaThumbSelectable ${index === activeIndex ? "isSelected" : ""}`}
              onClick={() => goTo(index)}
              key={photo.url}
              aria-label={`Lihat foto ${index + 1}`}
            >
              <img src={photo.thumbUrl} alt={`${alt} ${index + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div className="catalogPhotoLightbox" role="dialog" aria-modal="true" aria-label={`Foto besar ${alt}`} onClick={() => setExpanded(false)}>
          <button type="button" onClick={() => setExpanded(false)} aria-label="Tutup foto"><X size={24} /></button>
          {downloadNamePrefix ? (
            <a
              className="lightboxDownload"
              href={photos[activeIndex].url}
              download={downloadFileName(activeIndex)}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Unduh ${alt} kualitas penuh`}
            >
              <Download size={20} />
            </a>
          ) : null}
          {photos.length > 1 ? (
            <>
              <button type="button" className="lightboxNav lightboxNavPrev" onClick={(event) => { event.stopPropagation(); goTo(activeIndex - 1); }} aria-label="Foto sebelumnya">
                <ChevronLeft size={28} />
              </button>
              <button type="button" className="lightboxNav lightboxNavNext" onClick={(event) => { event.stopPropagation(); goTo(activeIndex + 1); }} aria-label="Foto berikutnya">
                <ChevronRight size={28} />
              </button>
            </>
          ) : null}
          <img
            src={photos[activeIndex].url}
            alt={alt}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      ) : null}
    </>
  );
}
