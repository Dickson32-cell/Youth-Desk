import { prisma } from "@/lib/db";

// The Assembly seal shown on every official printable (and the public footer).
// Uploaded once as SiteImage slot "seal" (public stream: /api/media/{id}).
export async function getSeal(): Promise<{ id: number } | null> {
  try {
    return await prisma.siteImage.findFirst({ where: { slot: "seal" }, orderBy: { id: "desc" }, select: { id: true } });
  } catch {
    return null;
  }
}
