import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// STABLE public URL for the Assembly seal: /api/seal redirects to the current
// /api/media/{id}. Client pages embed <img src="/api/seal"> without knowing
// the media id. If no seal is uploaded the browser just shows nothing.
export async function GET(req: NextRequest) {
  const seal = await prisma.siteImage.findFirst({ where: { slot: "seal" }, orderBy: { id: "desc" }, select: { id: true } });
  if (!seal) return new NextResponse(null, { status: 204 });
  return NextResponse.redirect(new URL("/api/media/" + seal.id, req.nextUrl.origin), 302);
}
