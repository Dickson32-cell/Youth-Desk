import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Confidential case lookup: the tracking NUMBER alone is not enough.
// Reporters hold a private KEY (SMS + slip). A wrong or missing key is
// indistinguishable from "case does not exist" - nothing about the case
// leaks to someone who only knows the number.
// Legacy cases created before keys have trackKey = null; for those the
// number alone still works (they predate the confidentiality change).
export async function GET(req: NextRequest) {
  const num = req.nextUrl.searchParams.get("caseNumber")?.trim().toUpperCase() || "";
  const key = req.nextUrl.searchParams.get("key")?.trim().toUpperCase() || "";
  if (!/^YD-\d{4}-\d+$/.test(num)) return NextResponse.json({ error: "Enter a case number like YD-2026-0001 and the tracking key from your SMS." }, { status: 400 });
  const c = await prisma.case.findUnique({
    where: { caseNumber: num },
    select: { caseNumber: true, status: true, type: true, area: true, createdAt: true, updatedAt: true, trackKey: true },
  });
  if (!c) return NextResponse.json({ error: "We could not find that case. Use the case number AND the tracking key from your SMS or slip." }, { status: 404 });
  if (c.trackKey && c.trackKey !== key) {
    return NextResponse.json({ error: "We could not find that case. Use the case number AND the tracking key from your SMS or slip." }, { status: 404 });
  }
  const { trackKey: _tk, ...safe } = c; // never ship the key back to the browser
  return NextResponse.json(safe);
}
