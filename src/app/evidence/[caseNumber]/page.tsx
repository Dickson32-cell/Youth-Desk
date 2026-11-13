import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import PrintBtn from "@/components/PrintBtn";

// Printable EVIDENCE SHEET for one case (officer-only): every uploaded file
// full-width on numbered pages so the officer can print/download it alone,
// hand it to the referral desk, or staple it to the Management report.
export const instant = false;

export default async function EvidenceSheet({ params }: { params: Promise<{ caseNumber: string }> }) {
  const { caseNumber } = await params;
  const sj = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!sj) redirect("/office/login");
  const num = decodeURIComponent(caseNumber).trim().toUpperCase();
  const c = await prisma.case.findUnique({
    where: { caseNumber: num },
    select: { caseNumber: true, type: true, area: true, createdAt: true, attachments: { select: { id: true, fileName: true, mimeType: true, createdAt: true }, orderBy: { id: "asc" } } },
  });
  if (!c) notFound();

  return (
    <main>
      <div className="card">
        <h2>NJSMA YOUTH DESK — EVIDENCE SHEET</h2>
        <p className="sub" style={{ margin: "0 0 4px" }}>Case {c.caseNumber} · {c.type}{c.area ? ` · ${c.area}` : ""} · received {new Date(c.createdAt).toLocaleDateString("en-GB")} · {c.attachments.length} file(s)</p>
      </div>
      {c.attachments.map((a) => (
        <div key={a.id} className="card evidence-page">
          <p className="sub" style={{ margin: "0 0 8px" }}>{a.fileName} · added {new Date(a.createdAt).toLocaleDateString("en-GB")}</p>
            {String(a.mimeType).startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/attachments/${a.id}`} alt={a.fileName} style={{ width: "100%", height: "auto", border: "1px solid #ccd8ea", borderRadius: 8, pageBreakInside: "avoid" }} />
          ) : (
            <p><a href={`/view/${a.id}`} target="_blank" rel="noreferrer">View this document ({a.mimeType} — opens in the viewer / its app)</a></p>
          )}
        </div>
      ))}
      {c.attachments.length === 0 && <div className="card"><p className="sub">No evidence files attached to this case.</p></div>}
      <div className="noprint" style={{ textAlign: "center", paddingBottom: 24 }}>
        <PrintBtn />
      </div>
    </main>
  );
}
