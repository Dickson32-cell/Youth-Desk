import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signSession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  const officer = await prisma.officer.findUnique({ where: { username: String(username).trim().toLowerCase() } });
  if (!officer) return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  const ok = await bcrypt.compare(String(password), officer.password);
  if (!ok) return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  const res = NextResponse.json({ ok: true, fullName: officer.fullName, role: officer.role });
  res.cookies.set(SESSION_COOKIE, signSession(officer.username), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 3600,
  });
  return res;
}
