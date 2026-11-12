import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PUBLIC image stream for officer-uploaded site media (hero slideshow, about gallery).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await prisma.siteImage.findUnique({ where: { id: Number(id) || -1 }, select: { mimeType: true, data: true } });
  if (!row) return new NextResponse("Not found", { status: 404 });
  const bytes = Buffer.from(row.data);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
