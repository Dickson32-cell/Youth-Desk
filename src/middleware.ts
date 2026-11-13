import { NextRequest, NextResponse } from "next/server";

// PUBLIC: landing, login, public report/track/programs, printables (slip + referral form) and their APIs,
// plus the PWA shell files (manifest + service worker + offline fallback) — browsers fetch these before any login.
const PUBLIC = ["/", "/report", "/track", "/programs", "/office/login", "/slip", "/forward", "/api/auth/login", "/api/public", "/api/media", "/api/news-image", "/manifest.webmanifest", "/sw.js", "/offline.html"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p)))) {
    return NextResponse.next();
  }
  const token = req.cookies.get("youthdesk_session")?.value;
  if (!token || !token.includes(".")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/office/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\.(?:png|jpg|svg|ico|css|txt)).*)"],
};
