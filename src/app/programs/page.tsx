import { prisma } from "@/lib/db";
import TopBar from "@/components/Shell";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Programs() {
  const list = await prisma.program.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <main>
      <TopBar on="programs" />
      <div className="main">
        <div className="card">
          <h2>Opportunities from the desk</h2>
          <p className="sub">Training, jobs, scholarships and programmes the Youth Desk has announced.</p>
          {list.length === 0 ? (
            <p style={{ fontSize: 14 }}>No opportunities posted yet. Check again soon — or follow the desk&apos;s announcements.</p>
          ) : (
            list.map((p) => (
              <div key={p.id} style={{ borderBottom: "1px solid #eef1f8", padding: "12px 0" }}>
                <b style={{ fontSize: 15 }}>{p.title}</b>
                <div style={{ fontSize: 12, color: "#5b6b86", marginBottom: 4 }}>{p.category}{p.deadline ? ` · apply by ${p.deadline}` : ""}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{p.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
