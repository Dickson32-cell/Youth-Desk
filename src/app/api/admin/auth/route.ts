import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Who am I signed in as (for the console header chip + dashboards).
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, username: s.u });
}
