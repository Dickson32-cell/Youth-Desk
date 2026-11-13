"use client";
import { useEffect, useState } from "react";

// Auto-advancing slideshow of officer-uploaded photos. Generic srcs let the
// same component drive the homepage hero (/api/media) and news galleries
// (/api/news-image). Fast-load: at most TWO <img> in the DOM (visible + next).
export default function Slideshow({ images, alt, priority = false, srcPrefix = "/api/media" }: { images: number[]; alt?: string; priority?: boolean; srcPrefix?: string }) {
  const [cur, setCur] = useState(0);
  const many = images.length > 1;

  useEffect(() => {
    if (!many) return;
    const t = setInterval(() => setCur((c) => (c + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length, many]);

  if (images.length === 0) return null;
  const visibleIds = many ? Array.from(new Set([images[cur], images[(cur + 1) % images.length]])) : [images[0]];

  return (
    <div className="slideshow" role="img" aria-label={alt || "Photo"}>
      {visibleIds.map((id) => {
        const i = images.indexOf(id);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={id}
            src={`${srcPrefix}/${id}`}
            alt=""
            className={"slide" + (i === cur ? " on" : "")}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 && priority ? "high" : undefined}
          />
        );
      })}
      
      {many && (
        <div className="dots">
          {images.map((id, i) => (
            <button key={id} className={"dot" + (i === cur ? " on" : "")} onClick={() => setCur(i)} aria-label={`Photo ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}
