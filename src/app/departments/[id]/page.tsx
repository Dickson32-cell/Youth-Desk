import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import PaperHead from "@/components/PaperHead";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

// Public page for one Assembly department — the officers console holds and edits the body.
export default async function DepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id) || 0;
  const dept = numericId
    ? await prisma.siteItem.findFirst({ where: { id: numericId, kind: "department" } })
    : null;
  if (!dept) notFound();
  const paragraphs = dept.body.split("\n").map((p) => p.trim()).filter(Boolean);
  return (
    <main>
      <PaperHead active="ABOUT" />
      <div className="main">
        <div className="card">
          <Link href="/" style={{ fontSize: 13, color: "var(--navy,#1c3f6e)", fontWeight: 600, textDecoration: "none" }}>
            &larr; Back to About &amp; Programmes
          </Link>
          <h2 style={{ marginTop: 10 }}>{dept.title}</h2>
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => (
              <p key={i} style={{ fontSize: 14.5, lineHeight: 1.7, margin: "10px 0" }}>{p}</p>
            ))
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.65, color: "#5b6b86" }}>
              This department&apos;s description has not been added yet. Please check back soon, or ask at the Youth Desk office.
            </p>
          )}
          <p style={{ fontSize: 13, color: "#5b6b86", marginTop: 14 }}>
            The Youth Desk links you to the right department for any youth-related case &mdash; report an issue and the desk follows it up for you.
          </p>
        </div>
      </div>
    </main>
  );
}
