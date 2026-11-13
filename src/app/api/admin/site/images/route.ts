import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { isAllowedType } from "@/lib/attachments";
import { revalidateTag } from "next/cache";

// Officer-managed public images. slot: "hero" (slideshow) | "about" | "logo"
// (brand logo shown on the console + the public site; a new logo replaces the old).
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slot = req.nextUrl.searchParams.get("slot") || "hero";
  const rows = await prisma.siteImage.findMany({
    where: { slot },
    orderBy: { sort: "asc" },
    select: { id: true, slot: true, mimeType: true, size: true, createdAt: true },
  });
  return NextResponse.json({ images: rows });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const slotRaw = String(fd.get("slot") ?? "hero");
  const slot: "hero" | "about" | "logo" = slotRaw === "about" ? "about" : slotRaw === "logo" ? "logo" : "hero";
  const files = [...fd.getAll("files")].filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length === 0) return NextResponse.json({ error: "Choose images to upload" }, { status: 400 });
  try {
    const saved: { id: number }[] = [];
    for (const f of files) {
      if (f.size > 4_000_000) throw new Error(`"${f.name}" is too large (max 4 MB).`);
      const mime = f.type || "image/jpeg";
      if (!mime.startsWith("image/") || !isAllowedType(mime, f.name)) throw new Error(`"${f.name}" is not an image (JPG/PNG/WebP).`);
      const buf = Buffer.from(await f.arrayBuffer());
      if (slot === "logo") {
        // A logo replaces any previous one - there is always exactly one.
        await prisma.siteImage.deleteMany({ where: { slot: "logo" } });
        revalidateTag("site-media");
      }
      const sort = await prisma.siteImage.count({ where: { slot } });
      const row = await prisma.siteImage.create({
        data: { slot, mimeType: mime, size: buf.length, sort, data: buf },
      });
      saved.push({ id: row.id });
    }
    return NextResponse.json({ ok: true, saved, count: saved.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id")) || 0;
  const gone = await prisma.siteImage.deleteMany({ where: { id } });
  if (gone.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateTag("site-media");
  return NextResponse.json({ ok: true });
}
