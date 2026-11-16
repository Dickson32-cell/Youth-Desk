import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signSession, SESSION_COOKIE } from "@/lib/auth";
import { loginAllowed, loginRecordFailure, ipOf } from "@/lib/flood";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  const uname = String(username).trim().toLowerCase();
  const ip = ipOf(req);
  // Brute-force guard: only failed attempts consume the budget, so a real
  // officer signing in correctly can never be locked out by it.
  if (!loginAllowed(ip, uname))
    return NextResponse.json({ error: "Too many sign-in attempts. Wait 15 minutes and try again." }, { status: 429 });
  const officer = await prisma.officer.findUnique({ where: { username: String(username).trim().toLowerCase() } });
  if (!officer) {
    loginRecordFailure(ip, uname);
    return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  }
  const ok = await bcrypt.compare(String(password), officer.password);
  if (!ok) {
    loginRecordFailure(ip, uname);
    return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, fullName: officer.fullName, role: officer.role });
  res.cookies.set(SESSION_COOKIE, signSession(officer.username), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 3600,
  });
  return res;
}
