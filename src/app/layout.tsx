import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Youth Desk — Municipal Assembly",
  description: "Report an issue, track it, and find youth opportunities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
