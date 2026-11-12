// Shared attachment intake rules. Files are stored in the Youth Desk's own
// database (no third-party bucket) so uploads stay inside the sealed project.
// Serverless request bodies cap at ~4.5 MB, so the per-file limit is 4 MB and
// images are downscaled in the browser before they ever reach the server.

export const MAX_ATTACHMENT_BYTES = 4_000_000;
export const MAX_FILES_PER_CASE = 5;

const EXT_BLOCK = /\.(exe|bat|cmd|com|scr|msi|js|jar|vbs|ps1|sh|php|asp|aspx?|html?|svg)$/i;

export type SavedAttachment = { id: number; fileName: string; mimeType: string; size: number };

export function sanitizeFileName(raw: string): string {
  const base = (raw.split(/[\\/]/).pop() || "file").replace(/[^\w .()\[\]-]/g, "_").trim();
  return base.slice(0, 80) || "file";
}

export function isAllowedType(mime: string, fileName: string): boolean {
  if (EXT_BLOCK.test(fileName)) return false;
  if (mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("audio/") || mime.startsWith("video/")) return mime !== "image/svg+xml";
  // Unknown mime but plain-looking extension (e.g. docx from some phones)
  return /\.(jpe?g|png|webp|heic|heif|pdf|mp3|m4a|wav|ogg|mp4|mov|docx?|xlsx?|txt)$/i.test(fileName);
}

export type PrismaLike = {
  attachment: {
    createMany?: never; // (shape kept loose on purpose)
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction?: any;
};

// Persists sanitized files; throws an Error with a friendly message on any bad input.
export async function saveAttachments(
  prisma: {
    attachment: {
      create: (args: {
        data: { caseId: number; fileName: string; mimeType: string; size: number; data: Buffer };
      }) => Promise<SavedAttachment>;
    };
  },
  caseId: number,
  files: File[],
): Promise<SavedAttachment[]> {
  const usable = files.filter((f) => f && f.size > 0);
  if (usable.length === 0) return [];
  if (usable.length > MAX_FILES_PER_CASE) throw new Error(`Up to ${MAX_FILES_PER_CASE} files per case.`);
  const saved: SavedAttachment[] = [];
  for (const f of usable) {
    if (f.size > MAX_ATTACHMENT_BYTES) throw new Error(`"${f.name}" is too large (max 4 MB per file).`);
    const mime = f.type || "application/octet-stream";
    if (!isAllowedType(mime, f.name)) throw new Error(`"${f.name}" is not an accepted file type.`);
    const buf = Buffer.from(await f.arrayBuffer());
    const row = await prisma.attachment.create({
      data: {
        caseId,
        fileName: sanitizeFileName(f.name),
        mimeType: mime,
        size: buf.length,
        data: buf,
      },
    });
    saved.push({ id: row.id, fileName: row.fileName, mimeType: row.mimeType, size: row.size });
  }
  return saved;
}
