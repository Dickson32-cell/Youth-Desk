import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Officer changes their OWN password (self-service). Requires the current one,
// saves a bcrypt hash - plaintext is never stored or logged.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirm = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!current || !next) return NextResponse.json({ error: "Fill in the current and new password" }, { status: 400 });
  if (next.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  if (confirm && next !== confirm) return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
  if (current === next) return NextResponse.json({ error: "The new password must be different from the current one" }, { status: 400 });
  const officer = await prisma.officer.findUnique({ where: { username: s.u } });
  if (!officer) return NextResponse.json({ error: "Session invalid" }, { status: 401 });
  if (!(await bcrypt.compare(current, officer.password)))
    return NextResponse.json({ error: "The current password is wrong" }, { status: 400 });
  await prisma.officer.update({ where: { username: s.u }, data: { password: bcrypt.hashSync(next, 10) } });
  return NextResponse.json({ ok: true });
}
