import { prisma } from "@/lib/db";
import TopBar from "@/components/Shell";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

// The Assembly's decentralised departments (draft list for Dickson to confirm/correct).
const DEPARTMENTS: [string, string][] = [
  ["Central Administration", "Runs the day-to-day work of the Assembly - records, correspondence and general services."],
  ["Finance Department", "Prepares and controls the budget, manages revenue and expenditure."],
  ["Works Department", "Public buildings, roads and infrastructure maintenance."],
  ["Physical Planning Department", "Town layout, planning advice and building permits."],
  ["Food and Agriculture Department", "Extension services and support for farmers and growers."],
  ["Social Welfare & Community Development", "Protection and support for vulnerable people; community programmes."],
  ["Trade, Industry & Tourism", "Support for local businesses, artisans and the municipal markets."],
];

// What the Assembly and its Youth Desk render to the public.
const SERVICES: [string, string][] = [
  ["Complaints and requests", "Bring any youth-related issue in person or through this website - you receive a case number and follow-up."],
  ["Referrals to departments", "The desk sends your case to the right department with a printed referral form and follows up for you."],
  ["Walk-in youth registration", "Young people who visit the desk are registered and given a youth serial card."],
  ["SMS updates", "You receive automatic text messages when your case is received, being worked on, and resolved."],
  ["Skill and job opportunities", "The desk announces training, jobs and scholarship programmes on this page and at the office."],
  ["Guidance on Assembly services", "Information on building permits, business support, welfare services and other Assembly services."],
];

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
          <h2>About the Assembly</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65 }}>
            The Municipal Assembly is the local government of our municipality - the body that plans,
            regulates and provides public services for residents and businesses. It works through
            decentralised departments, each responsible for a specific service to the public.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 8 }}>
            The <b>Youth Desk</b> is the Assembly&apos;s front door for young people: one office where youth
            walk in, are heard, and their matters are taken up with the right department and followed to resolution.
          </p>
        </div>

        <div className="card">
          <h2>Departments of the Assembly</h2>
          <p className="sub">Each department handles its own service for the public; the Youth Desk links you to the right one.</p>
          {DEPARTMENTS.map(([name, role]) => (
            <div key={name} style={{ borderBottom: "1px solid #eef1f8", padding: "10px 0" }}>
              <b style={{ fontSize: 14.5 }}>{name}</b>
              <div style={{ fontSize: 13, color: "#5b6b86", lineHeight: 1.5 }}>{role}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Services we render</h2>
          <p className="sub">What the Youth Desk and the Assembly do for you.</p>
          {SERVICES.map(([name, role]) => (
            <div key={name} style={{ borderBottom: "1px solid #eef1f8", padding: "10px 0" }}>
              <b style={{ fontSize: 14.5 }}>{name}</b>
              <div style={{ fontSize: 13, color: "#5b6b86", lineHeight: 1.5 }}>{role}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Youth opportunities</h2>
          <p className="sub">Training, jobs, scholarships and programmes the Youth Desk has announced.</p>
          {list.length === 0 ? (
            <p style={{ fontSize: 14 }}>No opportunities posted yet. Check again soon - or follow the desk&apos;s announcements.</p>
          ) : (
            list.map((p) => (
              <div key={p.id} style={{ borderBottom: "1px solid #eef1f8", padding: "12px 0" }}>
                <b style={{ fontSize: 15 }}>{p.title}</b>
                <div style={{ fontSize: 12, color: "#5b6b86", marginBottom: 4 }}>{p.category}{p.deadline ? ` - apply by ${p.deadline}` : ""}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.5 }}>{p.description}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
