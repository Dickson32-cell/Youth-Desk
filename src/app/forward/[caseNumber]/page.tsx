import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import PrintBtn from "@/components/PrintBtn";

// Printable referral form for the MCD or the responsible department (cacheComponents-compatible).
export const instant = false;

export default async function ReferralForm({ params }: { params: Promise<{ caseNumber: string }> }) {
  const { caseNumber } = await params;
  // The officer's full name (saved in Account) stamps the FROM line and signatures.
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
    include: {
      notes: { orderBy: { id: "asc" } },
      attachments: { select: { id: true, fileName: true }, orderBy: { id: "asc" } },
    },
  });
  if (!c) notFound();
  const to = c.forwardedTo || "";
  return (
    <main className="main" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1c3f6e", paddingBottom: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#122447" }}>NJSMA YOUTH DESK</div>
            <div style={{ fontSize: 11, letterSpacing: 1, color: "#5b6b86" }}>REFERRAL FORM — FOR NECESSARY ACTION</div>
          </div>
          <div style={{ fontSize: 11, color: "#5b6b86", lineHeight: 1.6, textAlign: "right" }}>
            Municipal Assembly<br />Youth Desk Office<br />Prepared {new Date().toLocaleDateString()}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 14 }}>
          <div><strong style={{ color: "#122447" }}>Ref No:</strong> <span style={{ fontWeight: 800, color: "#1c3f6e" }}>{c.caseNumber}</span></div>
          <div><strong style={{ color: "#122447" }}>Status:</strong> {c.status.replace("_", " ")}</div>
        </div>

        <div className="card" style={{ background: "#f4f7fc", marginBottom: 14 }}>
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <strong>TO:</strong> The{" "}
            <input className="ref-input" type="text" defaultValue={to} placeholder="type the department / office here"
              style={{ fontWeight: 800, border: "none", borderBottom: "1px dashed #8ba0bd", font: "inherit", fontSize: 13, width: "auto", minWidth: 260, background: "transparent", padding: "0 2px" }} /><br />
            <strong>FROM:</strong> {officerName ? <>The Youth Desk Officer (<b>{officerName}</b>), NJSMA Youth Desk</> : "The Youth Desk Officer, NJSMA Youth Desk"}<br />
            <strong>SUBJECT:</strong> Referral of case {c.caseNumber} for investigation and resolution
          </div>
        </div>

        <div className="kv" style={{ fontSize: 13 }}>
          <dt>Reported by</dt><dd>{c.reporterName || "Anonymous"}</dd>
          <dt>Contact phone</dt><dd>{c.phone || "—"}</dd>
          <dt>Area / community</dt><dd>{c.area || "—"}</dd>
          <dt>Category</dt><dd>{c.type}</dd>
          <dt>Received on</dt><dd>{new Date(c.createdAt).toLocaleString()}</dd>
          <dt>Evidence on file</dt><dd>{c.attachments.length > 0 ? `${c.attachments.length} file(s): ${c.attachments.map((a) => a.fileName).join(", ")}` : "None attached"}</dd>
        </div>

        <div style={{ fontSize: 11, color: "#5b6b86", letterSpacing: 1, margin: "14px 0 4px" }}>SUMMARY OF THE MATTER</div>
        <div className="note">{c.description}</div>

        {c.notes.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: "#5b6b86", letterSpacing: 1, margin: "12px 0 4px" }}>REMARKS BY THE YOUTH DESK OFFICER</div>
            {c.notes.map((n) => (
              <div key={n.id} className="note">
                <div className="who">{n.author} · {new Date(n.createdAt).toLocaleString()}</div>{n.body}
              </div>
            ))}
          </>
        )}

        <div style={{ fontSize: 11, color: "#5b6b86", letterSpacing: 1, margin: "12px 0 4px" }}>ACTION REQUESTED</div>
        <textarea className="ref-input" rows={3} defaultValue="The Youth Desk respectfully refers this matter to your office for the necessary investigation and resolution. Kindly advise the Youth Desk of the outcome so the complainant can be updated."
          style={{ width: "100%", border: "none", borderBottom: "1px dashed #ccd8ea", font: "inherit", fontSize: 13, lineHeight: 1.6, background: "#f7f9fd", borderRadius: 8, padding: "10px 12px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginTop: 26, paddingTop: 14, borderTop: "1px solid #ccd8ea", fontSize: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#5b6b86", marginBottom: 8 }}>Youth Desk Officer{officerName ? ` - ${officerName}` : ""}</div>
            <div style={{ color: "#9db0c9", marginBottom: 10, fontSize: 11 }}>Name &amp; Signature</div>
            <div style={{ borderTop: "1px solid #8ba0bd", paddingTop: 4 }}>________________________ &nbsp; Date: ____________</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#5b6b86", marginBottom: 18 }}>Received by (Office) — Name, Signature &amp; Stamp</div>
            <div style={{ borderTop: "1px solid #8ba0bd", paddingTop: 4 }}>________________________ &nbsp; Date: ____________</div>
          </div>
        </div>

        {c.attachments.length > 0 && (
          <div style={{ marginTop: 22, pageBreakBefore: "always", breakBefore: "page" }}>
            <div style={{ fontSize: 11, color: "#5b6b86", letterSpacing: 1, marginBottom: 8 }}>EVIDENCE ATTACHED TO THIS REFERRAL ({c.attachments.length} FILE{c.attachments.length === 1 ? "" : "S"})</div>
            {c.attachments.map((a) => (
              <div key={a.id} style={{ marginBottom: 18, pageBreakInside: "avoid" }}>
                <div style={{ fontSize: 11.5, color: "#5b6b86", marginBottom: 4 }}>{a.fileName}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/attachments/${a.id}`} alt={a.fileName} style={{ width: "100%", height: "auto", border: "1px solid #ccd8ea", borderRadius: 8 }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="noprint" style={{ textAlign: "center", marginTop: 10 }}>
        <p style={{ fontSize: 12.5, color: "#5b6b86", margin: "0 0 8px" }}>Type the department and the action requested above, then Print. {c.attachments.length > 0 ? `Evidence (${c.attachments.length} file${c.attachments.length === 1 ? "" : "s"}) prints on the pages after the referral form.` : ""}</p>
        <PrintBtn />
      </div>
    </main>
  );
}
