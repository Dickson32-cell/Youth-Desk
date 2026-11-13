import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import PrintBtn from "@/components/PrintBtn";

// IN-SYSTEM DOCUMENT VIEWER for one attachment (officer session required).
// Desktop: the document is embedded in the page (PDF/image render live).
// Phones: most mobile browsers refuse PDF inside a page, so the viewer
// redirects straight to the stream - Android/iOS Chrome then open their
// native PDF viewer over the same URL. Office documents (docx/xlsx) cannot
// render in ANY browser without Office - the page says so plainly and offers
// the one-tap download instead of pretending.
export const instant = false;

function isMobile(ua: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(ua || "");
}

export default async function AttachmentView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sj = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!sj) redirect("/office/login");
  const row = await prisma.attachment.findUnique({
    where: { id: Number(id) || -1 },
    select: { id: true, fileName: true, mimeType: true, size: true, createdAt: true, case: { select: { caseNumber: true, type: true } } },
  });
  if (!row) notFound();

  const ua = (await headers()).get("user-agent") || "";
  if (isMobile(ua)) {
    // Phones: hand the bytes to the native viewer at top level.
    redirect(`/api/attachments/${row.id}`);
  }

  const mime = row.mimeType || "";
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(row.fileName);
  const isAudio = mime.startsWith("audio/");
  const isVideo = mime.startsWith("video/");

  return (
    <main>
      <div className="card noprint" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ marginBottom: 4 }}>{row.fileName}</h2>
          <p className="sub" style={{ margin: 0 }}>
            Case {row.case.caseNumber} · {Math.round(row.size / 1024)} KB · added {new Date(row.createdAt).toLocaleDateString("en-GB")}
          </p>
        </div>
        <a href={`/api/attachments/${row.id}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Open in new tab</a>
        <a href={`/evidence/${row.case.caseNumber}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost">Full evidence sheet</a>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/attachments/${row.id}`} alt={row.fileName} style={{ width: "100%", height: "auto", display: "block" }} />
        ) : isPdf ? (
          <iframe src={`/api/attachments/${row.id}`} title={row.fileName} style={{ width: "100%", height: "82vh", border: "none", display: "block" }} />
        ) : isAudio ? (
          <div style={{ padding: 22 }}><audio controls src={`/api/attachments/${row.id}`} style={{ width: "100%" }} /></div>
        ) : isVideo ? (
          <video controls src={`/api/attachments/${row.id}`} style={{ width: "100%", maxHeight: "80vh", display: "block", background: "#000" }} />
        ) : (
          <div style={{ padding: 22 }}>
            <p style={{ marginTop: 0 }}>This is an Office document (.docx/.xlsx or similar). Browsers cannot display Office files - it opens in Word/Excel on your computer.</p>
            <a href={`/api/attachments/${row.id}`} className="btn btn-primary">Download to open in Word/Excel</a>
          </div>
        )}
      </div>
      <div className="noprint" style={{ textAlign: "center", paddingBottom: 24 }}>
        <PrintBtn />
      </div>
    </main>
  );
}
