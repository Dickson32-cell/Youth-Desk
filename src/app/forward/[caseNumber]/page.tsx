import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import PrintBtn from "@/components/PrintBtn";

// Printable referral form for the MCD or the responsible department (cacheComponents-compatible).
export const instant = false;

export default async function ReferralForm({ params }: { params: Promise<{ caseNumber: string }> }) {
  const { caseNumber } = await params;
  const c = await prisma.case.findUnique({
    where: { caseNumber: caseNumber.toUpperCase() },
    include: { notes: { orderBy: { id: "asc" } } },
  });
  if (!c) notFound();
  const to = c.forwardedTo || "";
  return (
    <main className="main" style={{ maxWidth: 720 }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #1c3f6e", paddingBottom: 10, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#122447" }}>MUNICIPAL YOUTH DESK</div>
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
            <strong>TO:</strong> The {to ? <span style={{ fontWeight: 800 }}>{to}</span> : "________________________________"}<br />
            <strong>FROM:</strong> The Youth Desk Officer, Municipal Youth Desk<br />
            <strong>SUBJECT:</strong> Referral of case {c.caseNumber} for investigation and resolution
          </div>
        </div>

        <div className="kv" style={{ fontSize: 13 }}>
          <dt>Reported by</dt><dd>{c.reporterName || "Anonymous"}</dd>
          <dt>Contact phone</dt><dd>{c.phone || "—"}</dd>
          <dt>Area / community</dt><dd>{c.area || "—"}</dd>
          <dt>Category</dt><dd>{c.type}</dd>
          <dt>Received on</dt><dd>{new Date(c.createdAt).toLocaleString()}</dd>
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
        <div className="note">
          The Youth Desk respectfully refers this matter to your office for the necessary investigation and
          resolution. Kindly advise the Youth Desk of the outcome so the complainant can be updated.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginTop: 26, paddingTop: 14, borderTop: "1px solid #ccd8ea", fontSize: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#5b6b86", marginBottom: 18 }}>Youth Desk Officer — Name &amp; Signature</div>
            <div style={{ borderTop: "1px solid #8ba0bd", paddingTop: 4 }}>________________________ &nbsp; Date: ____________</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#5b6b86", marginBottom: 18 }}>Received by (Office) — Name, Signature &amp; Stamp</div>
            <div style={{ borderTop: "1px solid #8ba0bd", paddingTop: 4 }}>________________________ &nbsp; Date: ____________</div>
          </div>
        </div>
      </div>
      <div className="noprint" style={{ textAlign: "center" }}>
        <PrintBtn />
      </div>
    </main>
  );
}
