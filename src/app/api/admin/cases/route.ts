import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE, nextSerialKey, caseFormat } from "@/lib/auth";
import { normalizeGhPhone, sendCaseSms, smsConfigured } from "@/lib/sms";

export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const cases = await prisma.case.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [
        { caseNumber: { contains: q } },
        { description: { contains: q } },
        { reporterName: { contains: q } },
        { area: { contains: q } },
      ] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { notes: { orderBy: { id: "asc" } } },
  });
  const counts = {
    all: await prisma.case.count(),
    NEW: await prisma.case.count({ where: { status: "NEW" } }),
    IN_PROGRESS: await prisma.case.count({ where: { status: "IN_PROGRESS" } }),
    RESOLVED: await prisma.case.count({ where: { status: "RESOLVED" } }),
    FORWARDED: await prisma.case.count({ where: { status: "FORWARDED" } }),
  };
  return NextResponse.json({ cases, counts });
}

// Walk-in intake: the officer logs a request/complaint on behalf of a youth who
// is physically at the desk. Same case numbering + confirmation SMS as the public form.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 15) : "";
  const area = typeof body.area === "string" ? body.area.trim().slice(0, 60) : "";
  const type = typeof body.type === "string" && body.type.trim() ? body.type.trim().slice(0, 20) : "OTHER";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 2000) : "";
  if (!description || description.length < 10)
    return NextResponse.json({ error: "Describe the issue (at least 10 characters)" }, { status: 400 });
  const caseNumber = await nextSerialKey(
    prisma,
    "case",
    caseFormat,
    async (candidate) => !!(await prisma.case.findUnique({ where: { caseNumber: candidate }, select: { id: true } })),
  );
  const created = await prisma.case.create({
    data: {
      caseNumber,
      reporterName: name || null,
      phone: phone || null,
      area: area || null,
      type,
      description,
      status: "NEW",
    },
  });
  await prisma.caseNote.create({ data: { caseId: created.id, body: `Logged by officer ${s.u}`, author: s.u } });
  const smsQueued = !!phone && smsConfigured() && !!normalizeGhPhone(phone);
  if (smsQueued) {
    after(async () => {
      await sendCaseSms(caseNumber, phone);
    });
  }
  return NextResponse.json({ ok: true, caseNumber, smsQueued, message: "Keep this number to track the case." });
}
