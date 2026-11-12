import { prisma } from "@/lib/db";
import TopBar from "@/components/Shell";
import Slideshow from "@/components/Slideshow";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Home() {
  const imgs = await prisma.siteImage.findMany({
    where: { slot: "hero" },
    orderBy: { sort: "asc" },
    select: { id: true },
  });
  return (
    <>
      <TopBar />
      <div className={"landing-band" + (imgs.length > 0 ? " hero-w-bg" : "")}>
        {imgs.length > 0 && (
          <div className="hero-bg" aria-hidden="true">
            <Slideshow images={imgs.map((i) => i.id)} alt="" />
          </div>
        )}
        <div className="hero" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1>Youth Desk - Municipal Assembly</h1>
          <p>
            One place for the municipality&apos;s young people: report an issue, get a case number,
            track it until it is resolved, and find training and job opportunities.
          </p>
          <a href="/report" className="btn btn-primary" style={{ background: "#fff", color: "#1c3f6e" }}>Report an issue</a>
        </div>
      </div>
      <main className="main">
        <div className="card">
          <h2>What you can do here</h2>
          <div className="choice">
            <a href="/report"><b>Report an issue</b><span>Walk-in or from your phone - anonymous or with your name. You receive a case number instantly.</span></a>
            <a href="/track"><b>Track your case</b><span>Enter your case number to see whether it is received, in progress, resolved, or forwarded.</span></a>
            <a href="/programs"><b>About &amp; opportunities</b><span>Departments and services of the Assembly, plus training, jobs and scholarships announced by the desk.</span></a>
          </div>
        </div>
      </main>
    </>
  );
}
