import { NextResponse } from "next/server";

// Dynamic PWA manifest: the install this app card and the home-screen icon
// always follow the officer's uploaded logo (icon slots are generated at
// upload time; without a logo the endpoints fall back to the built-in YD tiles).
export function GET() {
  const body = {
    name: "Youth Desk NJSMA",
    short_name: "Youth Desk",
    description: "The youth desk of the New Juaben South Municipal Assembly: report an issue, track it, find opportunities.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#1C3F6E",
    icons: [
      { src: "/api/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/api/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/api/pwa-icon/512m", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" },
  });
}
