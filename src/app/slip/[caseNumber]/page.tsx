import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import PrintBtn from "@/components/PrintBtn";

// Printable live case data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Slip({ params }: { params: Promise<{ caseNumber: string }> }) {
  const { caseNumber } = await params;
  let officerName = "";
  try {
    const ck = await cookies();
    const sj = verifySession(ck.get(SESSION_COOKIE)?.value);
    if (sj) {
      const o = await prisma.officer.findUnique({ where: { username: sj.u }, select: { fullName: true } });
      officerName = o?.fullName || "";
    }
  } catch { /* anonymous open still works */ }
  const c = await prisma.case.findUnique({
    where: { caseNumber: caseNumber.toUpperCase() },
    include: { notes: { orderBy: { id: "asc" } } },
  });
  if (!c) notFound();
  return (
    <main className="main" style={{ maxWidth: 620 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1c3f6e", paddingBottom: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#122447" }}>NJSMA YOUTH DESK</div>
            <div style={{ fontSize: 11, letterSpacing: 1, color: "#5b6b86" }}>CASE SLIP — KEEP THIS NUMBER</div>
          </div>
          <div style={{ fontSize: 11, color: "#5b6b86", lineHeight: 1.6, textAlign: "right" }}>
            NJSMA - Municipal Assembly<br />Youth Desk Office{officerName ? ` - ${officerName}` : ""}<br />{new Date(c.createdAt).toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "center", margin: "14px 0 18px" }}>
          <div style={{ fontSize: 11, color: "#5b6b86", letterSpacing: 1 }}>CASE NUMBER</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#1c3f6e", letterSpacing: 1 }}>{c.caseNumber}</div>
          <span className={"tag tag-" + c.status} style={{ marginTop: 6 }}>{c.status.replace("_", " ")}</span>
        </div>
        <div className="kv">
          <dt>Reported by</dt><dd>{c.reporterName || "Anonymous"}</dd>
          <dt>Phone</dt><dd>{c.phone || "—"}</dd>
          <dt>Area / community</dt><dd>{c.area || "—"}</dd>
          <dt>About</dt><dd>{c.type}</dd>
          <dt>Details</dt><dd>{c.description}</dd>
        </div>
        {c.notes.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: "#5b6b86", letterSpacing: 1, margin: "10px 0 6px" }}>OFFICER ACTIONS</div>
            {c.notes.map((n) => (
              <div key={n.id} className="note">
                <div className="who">{n.author} · {new Date(n.createdAt).toLocaleString()}</div>{n.body}
              </div>
            ))}
          </>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 14, borderTop: "1px solid #ccd8ea", fontSize: 12, color: "#5b6b86" }}>
          <div>Officer sign: ________________</div>
          <div>Date: ____________</div>
        </div>
        <p style={{ fontSize: 12, color: "#5b6b86", marginTop: 12 }}>
          NJSMA Youth Desk - track any time with your reference number. Keep this slip.
        </p>
      </div>
      <div className="noprint" style={{ textAlign: "center" }}>
        <PrintBtn />
      </div>
    </main>
  );
}
