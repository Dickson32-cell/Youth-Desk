import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { nextCaseNumber } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 15) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 60) : "";
  const type = typeof body.type === "string" ? body.type.trim().slice(0, 20) : "OTHER";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
  if (!description || description.length < 10)
    return NextResponse.json({ error: "Describe the issue (at least 10 characters)" }, { status: 400 });
  const anonymous = body.anonymous === true || !name;
  const latest = await prisma.case.findFirst({ orderBy: { id: "desc" }, select: { caseNumber: true } });
  const caseNumber = nextCaseNumber(latest?.caseNumber);
  await prisma.case.create({
    data: {
      caseNumber,
      reporterName: anonymous ? null : name || null,
      phone: phone || null,
      area: area || null,
      type,
      description,
      status: "NEW",
    },
  });
  return NextResponse.json({ ok: true, caseNumber, message: "Keep this number to track your case." });
}
