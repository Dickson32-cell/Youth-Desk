import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { isAllowedType } from "@/lib/attachments";

// Municipal news: officer-managed. Post with up to 3 images (multipart), edit
// (multipart or JSON), delete. Shown on the main page: latest-3 cards + ticker.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const news = await prisma.news.findMany({
    orderBy: { id: "desc" },
    take: 50,
    include: { images: { select: { id: true, mimeType: true, size: true }, orderBy: { sort: "asc" } } },
  });
  return NextResponse.json({ news });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ct = req.headers.get("content-type") || "";
  let title = "", body = "";
  let files: File[] = [];
  if (ct.startsWith("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    title = String(fd.get("title") ?? "");
    body = String(fd.get("body") ?? "");
    for (const v of fd.getAll("files")) if (v instanceof File) files.push(v);
  } else {
    const j = await req.json().catch(() => ({}));
    title = String(j.title ?? "");
    body = String(j.body ?? "");
  }
  title = title.trim().slice(0, 120);
  body = body.trim().slice(0, 4000);
  if (!title || !body) return NextResponse.json({ error: "A title and the news text are required" }, { status: 400 });
  files = files.filter((f) => f.size > 0).slice(0, 3);

  const created = await prisma.news.create({ data: { title, body, author: s.u } });
  const saved: { id: number }[] = [];
  let warning = "";
  let sort = 0;
  for (const f of files) {
    try {
      if (f.size > 4_000_000) throw new Error(`"${f.name}" is too large (max 4 MB).`);
      const mime = f.type || "image/jpeg";
      if (!mime.startsWith("image/") || !isAllowedType(mime, f.name)) throw new Error(`"${f.name}" is not an image (JPG/PNG/WebP).`);
      const buf = Buffer.from(await f.arrayBuffer());
      const img = await prisma.newsImage.create({ data: { newsId: created.id, mimeType: mime, size: buf.length, sort, data: buf } });
      saved.push({ id: img.id });
      sort++;
    } catch (e) {
      warning = e instanceof Error ? e.message : "One image failed";
    }
  }
  return NextResponse.json({ ok: true, id: created.id, saved, warning });
}

export async function PATCH(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id")) || 0;
  const news = await prisma.news.findUnique({ where: { id }, select: { id: true } });
  if (!news) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ct = req.headers.get("content-type") || "";
  let title = "", body = "";
  let addFiles: File[] = [];
  let removeIds: number[] = [];
  if (ct.startsWith("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (!fd) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    title = String(fd.get("title") ?? "");
    body = String(fd.get("body") ?? "");
    for (const v of fd.getAll("files")) if (v instanceof File) addFiles.push(v);
    removeIds = [...fd.getAll("removeImages")].map((v) => Number(v) || 0).filter(Boolean);
  } else {
    const j = await req.json().catch(() => ({}));
    title = String(j.title ?? "");
    body = String(j.body ?? "");
  }
  const data: { title?: string; body?: string } = {};
  const t = title.trim().slice(0, 120);
  const b = body.trim().slice(0, 4000);
  if (t) data.title = t;
  if (b) data.body = b;
  await prisma.news.update({ where: { id }, data });
  if (removeIds.length) await prisma.newsImage.deleteMany({ where: { id: { in: removeIds }, newsId: id } });
  const warning = "";
  let sort = await prisma.newsImage.count({ where: { newsId: id } });
  for (const f of addFiles.filter((v) => v.size > 0).slice(0, 3)) {
    if (sort >= 3) break;
    try {
      if (f.size > 4_000_000) throw new Error(`"${f.name}" is too large (max 4 MB).`);
      const mime = f.type || "image/jpeg";
      if (!mime.startsWith("image/") || !isAllowedType(mime, f.name)) throw new Error(`"${f.name}" is not an image (JPG/PNG/WebP).`);
      const buf = Buffer.from(await f.arrayBuffer());
      await prisma.newsImage.create({ data: { newsId: id, mimeType: mime, size: buf.length, sort, data: buf } });
      sort++;
    } catch {
      // keep going: one bad image must not fail the edit
    }
  }
  return NextResponse.json({ ok: true, warning });
}

export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id")) || 0;
  const gone = await prisma.news.deleteMany({ where: { id } });
  if (gone.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
