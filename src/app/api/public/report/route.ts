import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { nextSerialKey, caseFormat } from "@/lib/auth";
import { normalizeGhPhone, sendCaseSms, smsConfigured } from "@/lib/sms";
import { saveAttachments } from "@/lib/attachments";
import { newTrackKey } from "@/lib/trackKey";
import { reportAllowed, ipOf, allow as floodAllow } from "@/lib/flood";

export async function POST(req: NextRequest) {
  try {
    const ip = ipOf(req);
    // Cheap per-IP cap on ALL report attempts (with or without a phone).
    if (!floodAllow("report-attempt:" + (ip || "anon").slice(0, 60), 12, 60 * 60_000))
      return NextResponse.json({ error: "Too many reports from this device. Please try again later or walk into the Youth Desk office." }, { status: 429 });
  const ct = req.headers.get("content-type") || "";
  const files: File[] = [];
  let name = "", phone = "", area = "", type = "", description = "", anonymous = false;
  if (ct.startsWith("multipart/form-data")) {
    const fd = await req.formData();
    name = String(fd.get("name") ?? "");
    phone = String(fd.get("phone") ?? "");
    area = String(fd.get("area") ?? "");
    type = String(fd.get("type") ?? "");
    description = String(fd.get("description") ?? "");
    for (const v of fd.getAll("files")) if (v instanceof File) files.push(v);
  } else {
    const body = await req.json().catch(() => ({}));
    name = typeof body.name === "string" ? body.name : "";
    phone = typeof body.phone === "string" ? body.phone : "";
    area = typeof body.area === "string" ? body.area : "";
    type = typeof body.type === "string" ? body.type : "";
    description = typeof body.description === "string" ? body.description : "";
    anonymous = body.anonymous === true;
  }
  name = name.trim().slice(0, 80);
  phone = phone.trim().slice(0, 15);
  area = area.trim().slice(0, 60);
  type = (type || "OTHER").trim().slice(0, 20);
  description = description.trim().slice(0, 2000);
  if (!description || description.length < 10)
    return NextResponse.json({ error: "Describe the issue (at least 10 characters)" }, { status: 400 });
  anonymous = anonymous || !name;
  const phoneNorm = normalizeGhPhone(phone);
  // SMS-bombing / wallet-drain guard: at most 3 confirmation SMS per phone
  // per 15 minutes, plus a per-IP cap for all attempts.
  if (!reportAllowed(ip, phoneNorm))
    return NextResponse.json({ error: "Too many reports for this phone number right now. Try again later or call the Youth Desk office." }, { status: 429 });
  const caseNumber = await nextSerialKey(
    prisma,
    "case",
    caseFormat,
    async (candidate) => !!(await prisma.case.findUnique({ where: { caseNumber: candidate }, select: { id: true } })),
  );
  // A private tracking key is issued with every case. The case NUMBER goes on
  // the public face; the KEY (SMS + slip) is the only thing that opens it.
  const trackKey = newTrackKey();
  const created = await prisma.case.create({
    data: {
      caseNumber,
      reporterName: anonymous ? null : name || null,
      phone: phone || null,
      area: area || null,
      type,
      description,
      status: "NEW",
      trackKey,
    },
  });
  // Evidence files (photos/documents). A failed upload never blocks the case:
  // the youth still gets their number, with a clear warning instead.
  let warning = "";
  if (files.length > 0) {
    try {
      await saveAttachments(prisma, created.id, files);
    } catch (e) {
      warning = e instanceof Error ? e.message : "Upload failed";
    }
  }
  // Confirmation SMS (case number + how to track) - after() keeps the reply fast
  // and runs the send after the response is closed. Only when a valid phone exists.
  const smsQueued = !!phone && smsConfigured() && !!normalizeGhPhone(phone);
  if (smsQueued) {
    after(async () => {
      await sendCaseSms(caseNumber, phone, trackKey);
    });
  }
  return NextResponse.json({ ok: true, caseNumber, trackKey, smsQueued, warning, message: "Keep this number AND your tracking key to track the case." });
  } catch (e) {
    // The flood guard wrapped the whole intake; unexpected errors report plainly.
    if (e instanceof SyntaxError) throw e;
    return NextResponse.json({ error: "Could not file the report. Try again in a moment." }, { status: 500 });
  }
}
