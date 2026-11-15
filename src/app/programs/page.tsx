import { prisma } from "@/lib/db";
import PaperHead from "@/components/PaperHead";
import AboutGallery from "@/components/AboutGallery";

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
  const [deptItems, svcItems, aboutImgs] = await Promise.all([
    prisma.siteItem.findMany({ where: { kind: "department" }, orderBy: { id: "asc" }, select: { id: true, title: true, body: true } }),
    prisma.siteItem.findMany({ where: { kind: "service" }, orderBy: { id: "asc" }, select: { id: true, title: true, body: true } }),
    prisma.siteImage.findMany({ where: { slot: "about" }, orderBy: { sort: "asc" }, select: { id: true } }),
  ]);
  const depts: [string, string][] = deptItems.length > 0
    ? deptItems.map((d) => [d.title, d.body] as [string, string])
    : DEPARTMENTS;
  const svcs: [string, string][] = svcItems.length > 0
    ? svcItems.map((d) => [d.title, d.body] as [string, string])
    : SERVICES;
  return (
    <main>
      <PaperHead active="ABOUT" />
      <div className="main">
        <div className="card">
          <h2>About the Assembly</h2>
          <p style={{ fontSize: 14, lineHeight: 1.65 }}>
            The New Juaben South Municipal Assembly is the local government authority for our
            municipality, responsible for planning, regulating and delivering public services to
            residents and businesses. It operates through decentralized departments, each charged
            with a specific area of service to the public.
          </p>
          <p style={{ fontSize: 14, lineHeight: 1.65, marginTop: 8 }}>
            The <b>Youth Desk</b> is the Assembly&rsquo;s front door for young people: a single point
            of contact where youth can walk in, be heard, and have their concerns taken up with the
            appropriate department and followed through to resolution.
          </p>
          {aboutImgs.length > 0 && <AboutGallery images={aboutImgs} />}
        </div>

        <div className="card">
          <h2>Departments of the Assembly</h2>
          <p className="sub">Each department handles its own service for the public; the Youth Desk links you to the right one.</p>
          {depts.map(([name, role]) => (
            <div key={name} style={{ borderBottom: "1px solid #eef1f8", padding: "10px 0" }}>
              <b style={{ fontSize: 14.5 }}>{name}</b>
              <div style={{ fontSize: 13, color: "#5b6b86", lineHeight: 1.5 }}>{role}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Services we render</h2>
          <p className="sub">What the Youth Desk and the Assembly do for you.</p>
          {svcs.map(([name, role]) => (
            <div key={name} style={{ borderBottom: "1px solid #eef1f8", padding: "10px 0" }}>
              <b style={{ fontSize: 14.5 }}>{name}</b>
              <div style={{ fontSize: 13, color: "#5b6b86", lineHeight: 1.5 }}>{role}</div>
            </div>
          ))}
        </div>
      </div>
    
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
              </footer>
</main>
  );
}
