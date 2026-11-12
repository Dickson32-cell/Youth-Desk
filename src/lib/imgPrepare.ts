// Browser-side image compression: phone photos are 2-8 MB, serverless bodies
// cap at ~4.5 MB. Downscale to max 1600px on the long edge at 80% JPEG quality
// before upload; non-images and already-small files pass through untouched.
export async function prepareFilesForUpload(input: FileList | File[]): Promise<File[]> {
  const files = Array.from(input);
  const out: File[] = [];
  for (const f of files) {
    try {
      if (!f.type.startsWith("image/") || f.size < 150_000 || f.type === "image/gif") {
        out.push(f);
        continue;
      }
      const bitmap = await createImageBitmap(f);
      const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { out.push(f); continue; }
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
      if (!blob) { out.push(f); continue; }
      out.push(new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }));
    } catch {
      out.push(f);
    }
  }
  return out;
}
