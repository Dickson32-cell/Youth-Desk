import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { nextSerialKey, caseFormat } from "@/lib/auth";
import { normalizeGhPhone, sendCaseSms, smsConfigured } from "@/lib/sms";
import { saveAttachments } from "@/lib/attachments";

export async function POST(req: NextRequest) {
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
  const caseNumber = await nextSerialKey(
    prisma,
    "case",
    caseFormat,
    async (candidate) => !!(await prisma.case.findUnique({ where: { caseNumber: candidate }, select: { id: true } })),
  );
  const created = await prisma.case.create({
    data: {
      caseNumber,
      reporterName: anonymous ? null : name || null,
      phone: phone || null,
      area: area || null,
      type,
      description,
      status: "NEW",
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
      await sendCaseSms(caseNumber, phone);
    });
  }
  return NextResponse.json({ ok: true, caseNumber, smsQueued, warning, message: "Keep this number to track your case." });
}
