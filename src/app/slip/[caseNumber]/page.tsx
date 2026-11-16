import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { getSeal } from "@/lib/seal";
import PrintBtn from "@/components/PrintBtn";

// Printable live case data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Slip({ params }: { params: Promise<{ caseNumber: string }> }) {
  const { caseNumber } = await params;
  // Confidentiality law: the number ALONE must open nothing. This printable
  // carries notes and personal details, so only a signed-in officer may open it.
  const ck = await cookies();
  const sj = verifySession(ck.get(SESSION_COOKIE)?.value);
  const o = sj ? await prisma.officer.findUnique({ where: { username: sj.u }, select: { fullName: true } }) : null;
  const officerName = o?.fullName || "";
  const c = await prisma.case.findUnique({
    where: { caseNumber: caseNumber.toUpperCase() },
    include: { notes: { orderBy: { id: "asc" } } },
  });
  // notFound() is deliberately NOT used here: Next 16 serves a prerendered
  // not-found shell per URL for minutes, which once poisoned fresh cases
  // (the officer's own print right after intake looked like a dead link).
  if (!sj)
    return (
      <main className="main" style={{ maxWidth: 560 }}>
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 16, color: "#122447", marginBottom: 6 }}>Officers only</div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>This printable carries case details. Sign in from the officer console to print the case slip.</p>
          <a href="/office/login" className="btn btn-ghost btn-sm">Officer sign in</a>
        </div>
      </main>
    );
  if (!c)
    return (
      <main className="main" style={{ maxWidth: 560 }}>
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 16, color: "#122447", marginBottom: 6 }}>No such case</div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>The case number printed above does not exist. Check the number on the case record.</p>
        </div>
      </main>
    );
  const seal = await getSeal();
  return (
    <main className="main" style={{ maxWidth: 620 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1c3f6e", paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {seal ? <img src={"/api/media/" + seal.id} alt="NJSMA seal" style={{ width: 64, height: 64, objectFit: "contain" }} /> : null}
            <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#122447" }}>NJSMA YOUTH DESK</div>
            <div style={{ fontSize: 11, letterSpacing: 1, color: "#5b6b86" }}>CASE SLIP — KEEP THIS NUMBER</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#5b6b86", lineHeight: 1.6, textAlign: "right" }}>
            New Juaben South Municipal Assembly<br />Youth Desk Office{officerName ? ` - ${officerName}` : ""}<br />{new Date(c.createdAt).toLocaleString()}
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
        <div className="row" style={{ marginTop: 16, padding: "8px 10px", border: "1px solid #ccd8ea", borderRadius: 6, fontSize: 13 }}>
          <b>Tracking key: {c.trackKey || "(not set)"}</b> — keep this private. Together with the case number it is the only way to view this case online.
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 14, borderTop: "1px solid #ccd8ea", fontSize: 12, color: "#5b6b86" }}>
          <div>Officer sign: ________________</div>
          <div>Date: ____________</div>
        </div>
        <p style={{ fontSize: 12, color: "#5b6b86", marginTop: 12 }}>
          NJSMA Youth Desk - track with your reference number AND tracking key. Keep this slip.
        </p>
      </div>
      <div className="noprint" style={{ textAlign: "center" }}>
        <PrintBtn />
      </div>
    </main>
  );
}
