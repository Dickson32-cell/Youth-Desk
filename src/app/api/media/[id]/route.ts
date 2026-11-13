import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

// PUBLIC image stream for officer-uploaded site media (hero slideshow, logo, about gallery).
// Media ids are immutable: once uploaded the bytes never change, so the bytes are
// CACHE-KEYED server-side (revalidate 1h) and served with a long-lived immutable
// client header. Repeat views - and repeat slides in the same session - come back
// almost instantly without touching the database.
const getMedia = unstable_cache(
  async (id: number) => prisma.siteImage.findUnique({ where: { id }, select: { mimeType: true, data: true } }),
  ["site-media"],
  { revalidate: 3600 },
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw) || -1;
  const row = await getMedia(id);
  if (!row) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const bytes = Buffer.from(row.data);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=86400, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
