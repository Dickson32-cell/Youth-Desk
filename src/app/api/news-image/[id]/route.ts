import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

// PUBLIC stream for municipal-news images. News ids are immutable: the bytes
// are cached server-side and sent with a long-lived immutable client header
// (same speed law as the hero slideshow media).
const getImg = unstable_cache(
  async (id: number) => prisma.newsImage.findUnique({ where: { id }, select: { mimeType: true, data: true } }),
  ["news-media"],
  { revalidate: 3600, tags: ["news-media"] },
);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw) || -1;
  const row = await getImg(id);
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
