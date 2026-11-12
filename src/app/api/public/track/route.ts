import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const num = req.nextUrl.searchParams.get("caseNumber")?.trim().toUpperCase() || "";
  if (!/^YD-\d{4}-\d+$/.test(num)) return NextResponse.json({ error: "Enter a case number like YD-2026-0001" }, { status: 400 });
  const c = await prisma.case.findUnique({
    where: { caseNumber: num },
    select: { caseNumber: true, status: true, type: true, area: true, createdAt: true, updatedAt: true },
  });
  if (!c) return NextResponse.json({ error: "No case with that number" }, { status: 404 });
  return NextResponse.json(c);
}
