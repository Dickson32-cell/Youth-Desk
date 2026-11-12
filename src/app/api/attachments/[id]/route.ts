import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Officer-only file download: streams the stored bytes with the original
// name/type. Requires the officer session cookie.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await prisma.attachment.findUnique({ where: { id: Number(id) || -1 } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bytes = Buffer.from(row.data);
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": row.mimeType,
      "Content-Disposition": `inline; filename="${row.fileName.replace(/["\\]/g, "")}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
