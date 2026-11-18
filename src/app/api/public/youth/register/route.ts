import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { nextSerialKey, youthFormat } from "@/lib/auth";
import { normalizeGhPhone, sendYouthRegisterSms, smsConfigured } from "@/lib/sms";
import { allow as floodAllow, reportAllowed, ipOf } from "@/lib/flood";

// Public youth self-registration. Online rows land in the SAME Youth register
// the officers use for walk-ins (source = "ONLINE", stamped so the office can
// see which ones came from the website) and are included in the Excel export.
export async function POST(req: NextRequest) {
  try {
    const ip = ipOf(req);
    if (!floodAllow("youth-reg:" + (ip || "anon").slice(0, 60), 12, 60 * 60_000))
      return NextResponse.json({ error: "Too many attempts from this device. Please try again later." }, { status: 429 });
    const b = await req.json().catch(() => ({}));
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
    const phone = typeof b.phone === "string" ? b.phone.trim().slice(0, 15) : "";
    const area = typeof b.area === "string" ? b.area.trim().slice(0, 60) : "";
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const phoneNorm = phone ? normalizeGhPhone(phone) : null;
    // Any phone-bearing registration costs a confirmation SMS - reuse the
    // same per-phone/per-IP SMS-bomb guard the case report uses.
    if (phoneNorm && !reportAllowed(ip, phoneNorm))
      return NextResponse.json({ error: "Too many registrations for this phone number right now. Try again later or visit the office." }, { status: 429 });
    const serial = await nextSerialKey(
      prisma,
      "youth",
      youthFormat,
      async (candidate) => !!(await prisma.youth.findUnique({ where: { serial: candidate }, select: { id: true } })),
    );
    const youth = await prisma.youth.create({
      data: { serial, name, phone: phoneNorm || (phone || null), area: area || null, source: "ONLINE" },
    });
    let smsQueued = false;
    if (phoneNorm && smsConfigured()) {
      smsQueued = true;
      after(async () => {
        await sendYouthRegisterSms(serial, phoneNorm as string);
      });
    }
    return NextResponse.json({ ok: true, serial: youth.serial, smsQueued });
  } catch {
    return NextResponse.json({ error: "Could not save the registration. Try again in a moment." }, { status: 500 });
  }
}
