import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Officer saves their full name; it stamps every report and printout.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const fullName = typeof b.fullName === "string" ? b.fullName.trim().slice(0, 80) : "";
  if (fullName.length < 3) return NextResponse.json({ error: "Type your full name" }, { status: 400 });
  await prisma.officer.update({ where: { username: s.u }, data: { fullName } });
  return NextResponse.json({ ok: true, fullName });
}
