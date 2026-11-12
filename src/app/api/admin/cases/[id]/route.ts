import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Delete a case (officer / console session only) — for inappropriate or junk
// reports. Hard delete (notes cascade). Case numbers are never reissued
// (server-side Counter, serial-retire law).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId) || caseId <= 0) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const existing = await prisma.case.findUnique({ where: { id: caseId }, select: { caseNumber: true } });
  if (!existing) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  await prisma.case.delete({ where: { id: caseId } });
  return NextResponse.json({ ok: true, deleted: existing.caseNumber });
}
