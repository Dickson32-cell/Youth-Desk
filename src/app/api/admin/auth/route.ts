import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Who am I signed in as (console header chip + dashboards) with the officer's full name.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const o = await prisma.officer.findUnique({ where: { username: s.u }, select: { fullName: true } }).catch(() => null);
  return NextResponse.json({ ok: true, username: s.u, fullName: o?.fullName || "" });
}
