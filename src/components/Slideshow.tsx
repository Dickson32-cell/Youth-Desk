"use client";
import { useEffect, useState } from "react";

// Auto-advancing slideshow of officer-uploaded Assembly photos.
export default function Slideshow({ images, alt }: { images: number[]; alt?: string }) {
  const [cur, setCur] = useState(0);
  const many = images.length > 1;

  useEffect(() => {
    if (!many) return;
    const t = setInterval(() => setCur((c) => (c + 1) % images.length), 4000);
    return () => clearInterval(t);
  }, [images.length, many]);

  if (images.length === 0) return null;
  return (
    <div className="slideshow" role="img" aria-label={alt || "Assembly photo"}>
      {images.map((id, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={id} src={`/api/media/${id}`} alt="" className={"slide" + (i === cur ? " on" : "")} />
      ))}
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
