import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE, nextSerialKey, caseFormat } from "@/lib/auth";
import { normalizeGhPhone, sendCaseSms, smsConfigured } from "@/lib/sms";
import { newTrackKey } from "@/lib/trackKey";
import { saveAttachments } from "@/lib/attachments";

export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const cases = await prisma.case.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(q ? { OR: [
        { caseNumber: { contains: q } },
        { description: { contains: q } },
        { reporterName: { contains: q } },
        { area: { contains: q } },
      ] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      notes: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true }, orderBy: { id: "asc" } },
    } as const,
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
// is physically at the desk. Same case numbering + confirmation SMS as the public
// form. Accepts optional youthId to link the complaint to a registered walk-in
// youth (name/phone/area fall back to the youth's register values).
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ct = req.headers.get("content-type") || "";
  const files: File[] = [];
  let name = "", phone = "", area = "", type = "", description = "", youthId: number | null = null;
  if (ct.startsWith("multipart/form-data")) {
    const fd = await req.formData();
    name = String(fd.get("name") ?? "");
    phone = String(fd.get("phone") ?? "");
    area = String(fd.get("area") ?? "");
    type = String(fd.get("type") ?? "");
    description = String(fd.get("description") ?? "");
    const yid = fd.get("youthId");
    if (yid !== null && String(yid).trim() !== "") youthId = Number(yid) || null;
    for (const v of fd.getAll("files")) if (v instanceof File) files.push(v);
  } else {
    const body = await req.json().catch(() => ({}));
    name = typeof body.name === "string" ? body.name : "";
    phone = typeof body.phone === "string" ? body.phone : "";
    area = typeof body.area === "string" ? body.area : "";
    type = typeof body.type === "string" ? body.type : "";
    description = typeof body.description === "string" ? body.description : "";
    if (body.youthId !== undefined && body.youthId !== null && body.youthId !== "") youthId = Number(body.youthId) || null;
  }
  description = description.trim().slice(0, 2000);
  if (!description || description.length < 10)
    return NextResponse.json({ error: "Describe the issue (at least 10 characters)" }, { status: 400 });
  let youth: { id: number; name: string; phone: string | null; area: string | null } | null = null;
  if (youthId !== null) {
    const y = await prisma.youth.findUnique({ where: { id: youthId }, select: { id: true, name: true, phone: true, area: true } });
    if (!y) return NextResponse.json({ error: "That youth is not in the register" }, { status: 400 });
    youth = y;
    if (!name) name = y.name;
    if (!phone) phone = y.phone || "";
    if (!area) area = y.area || "";
  }
  const caseNumber = await nextSerialKey(
    prisma,
    "case",
    caseFormat,
    async (candidate) => !!(await prisma.case.findUnique({ where: { caseNumber: candidate }, select: { id: true } })),
  );
  const trackKey = newTrackKey();
  const created = await prisma.case.create({
    data: {
      caseNumber,
      trackKey,
      reporterName: name || null,
      phone: phone || null,
      area: area || null,
      type: (type || "OTHER").trim().slice(0, 20),
      description,
      status: "NEW",
      youthId: youth ? youth.id : null,
    },
  });
  await prisma.caseNote.create({ data: { caseId: created.id, body: `Logged by officer ${s.u}`, author: s.u } });
  let warning = "";
  if (files.length > 0) {
    try {
      await saveAttachments(prisma, created.id, files);
    } catch (e) {
      warning = e instanceof Error ? e.message : "Upload failed";
    }
  }
  const smsQueued = !!phone && smsConfigured() && !!normalizeGhPhone(phone);
  if (smsQueued) {
    after(async () => {
      await sendCaseSms(caseNumber, phone, trackKey);
    });
  }
  return NextResponse.json({ ok: true, caseNumber, trackKey, smsQueued, warning, message: "Keep this number AND the tracking key to track the case." });
}
