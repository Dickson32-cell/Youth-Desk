import { NextRequest, NextResponse } from "next/server";

// PUBLIC: landing, login, public report/track/programs and their APIs.
const PUBLIC = ["/", "/report", "/track", "/programs", "/office/login", "/api/auth/login", "/api/public"];

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
