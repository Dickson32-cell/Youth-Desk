import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Officer-only document/image stream. Requires the officer session cookie.
// The stored mimeType is honoured, but many phones upload with an empty or
// generic type - so the bytes are SNIFFED for a known magic signature and the
// content-type is corrected. With a true application/pdf type the phone opens
// its built-in viewer and desktop browsers render the document inline, which
// is what "view the document in the system" needs.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await prisma.attachment.findUnique({ where: { id: Number(id) || -1 } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bytes = Buffer.from(row.data);
  const type = contentTypeOf(row.mimeType, row.fileName, bytes);
  const safeName = row.fileName.split(String.fromCharCode(34)).join("").split(String.fromCharCode(92)).join("");
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// Correct the content type: magic bytes first (uploads from phones often lie),
// then a meaningful stored value, then the file extension.
function contentTypeOf(stored: string, fileName: string, bytes: Buffer): string {
  const sig = (p: number[], off = 0) => p.every((b, i) => bytes[off + i] === b);
  const ext = (fileName.match(/\.(\w{1,8})$/)?.[1] || "").toLowerCase();
  const byExt: Record<string, string> = {
    pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", gif: "image/gif", txt: "text/plain; charset=utf-8",
    doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg",
    mp4: "video/mp4", mov: "video/quicktime", heic: "image/heic", heif: "image/heif",
  };
  if (sig([0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
  if (sig([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (sig([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (sig([0x47, 0x49, 0x46])) return "image/gif";
  if (sig([0x52, 0x49, 0x46, 0x46]) && sig([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (sig([0x50, 0x4b, 0x03, 0x04])) {
    // zip container = modern Office formats; distinguish by extension
    if (ext === "docx") return byExt.docx;
    if (ext === "xlsx") return byExt.xlsx;
    return "application/zip";
  }
  if (sig([0x49, 0x44, 0x33]) || (bytes.length > 1 && (bytes[0] & 0xff) === 0xff && (bytes[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (stored && stored !== "application/octet-stream" && stored !== "binary/octet-stream") return stored;
  if (byExt[ext]) return byExt[ext];
  return stored || "application/octet-stream";
}
