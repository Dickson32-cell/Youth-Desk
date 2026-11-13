"use client";
import { useEffect, useState } from "react";

// Click-to-view gallery for the public About page: a tap opens the photo
// full-screen (lightbox); X, Escape, a tap on the dark area, or the arrows
// close / move between photos. Pure client-side over the media endpoints.
type Img = { id: number };

export default function AboutGallery({ images }: { images: Img[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((v) => (v === null ? v : Math.min(v + 1, images.length - 1)));
      if (e.key === "ArrowLeft") setOpen((v) => (v === null ? v : Math.max(v - 1, 0)));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // the page must not scroll behind the viewer
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, images.length]);

  if (!images.length) return null;
  const current = images.find((im) => im.id === open);

  return (
    <>
      <div className="aboutgal">
        {images.map((im) => (
          <button key={im.id} type="button" className="galleryitem" onClick={() => setOpen(im.id)} title="Tap to view the photo" aria-label="View photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/media/${im.id}`} alt="Assembly" loading="lazy" />
          </button>
        ))}
      </div>
      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onClick={() => setOpen(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 90, background: "rgba(8,16,32,.92)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 18, cursor: "zoom-out",
          }}
        >
          <div style={{ position: "absolute", top: 12, right: 14, left: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
            <span style={{ color: "#cfd8e8", fontSize: 12.5 }}>
              {images.findIndex((im) => im.id === open) + 1} / {images.length}
            </span>
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => { e.stopPropagation(); setOpen(null); }}
              style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "none", borderRadius: 999, width: 40, height: 40, fontSize: 18, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => { e.stopPropagation(); setOpen((v) => (v === null ? v : Math.max(v - 1, 0))); }}
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.12)", color: "#fff", border: "none", borderRadius: 999, width: 44, height: 44, fontSize: 20, cursor: "pointer" }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => { e.stopPropagation(); setOpen((v) => (v === null ? v : Math.min(v + 1, images.length - 1))); }}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.12)", color: "#fff", border: "none", borderRadius: 999, width: 44, height: 44, fontSize: 20, cursor: "pointer" }}
              >
                ›
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/media/${current.id}`}
            alt="Assembly"
            onClick={(e) => e.stopPropagation()} /* taps ON the photo keep it open */
            style={{ maxWidth: "min(94vw, 1200px)", maxHeight: "86vh", width: "auto", height: "auto", borderRadius: 10, boxShadow: "0 12px 60px rgba(0,0,0,.5)", cursor: "default" }}
          />
        </div>
      )}
    </>
  );
}
