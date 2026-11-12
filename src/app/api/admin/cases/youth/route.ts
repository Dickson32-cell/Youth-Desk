import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE, nextSerialKey, youthFormat } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const youth = await prisma.youth.findMany({
    where: q ? {
      OR: [
        { name: { contains: q } },
        { serial: { contains: q } },
        { area: { contains: q } },
        { phone: { contains: q } },
      ],
    } : {},
    orderBy: { id: "desc" },
    take: 200,
  });
  return NextResponse.json({ youth });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const serial = await nextSerialKey(
    prisma,
    "youth",
    youthFormat,
    async (candidate) => !!(await prisma.youth.findUnique({ where: { serial: candidate }, select: { id: true } })),
  );
  const youth = await prisma.youth.create({
    data: {
      serial,
      name,
      phone: body.phone ? String(body.phone).trim().slice(0, 15) : null,
      area: body.area ? String(body.area).trim().slice(0, 60) : null,
      education: body.education ? String(body.education).trim().slice(0, 60) : null,
      skills: body.skills ? String(body.skills).trim().slice(0, 200) : null,
      ghanaCard: body.ghanaCard ? String(body.ghanaCard).trim().slice(0, 20) : null,
      dateOfBirth: body.dateOfBirth ? String(body.dateOfBirth).slice(0, 12) : null,
    },
  });
  return NextResponse.json({ ok: true, youth });
}
