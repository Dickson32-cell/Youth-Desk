import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import TopBar from "@/components/Shell";
import Slideshow from "@/components/Slideshow";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Home() {
  const getHeroIds = unstable_cache(
    async () => prisma.siteImage.findMany({ where: { slot: "hero" }, orderBy: { sort: "asc" }, select: { id: true } }),
    ["hero-ids"],
    { revalidate: 300 },
  );
  const getWords = unstable_cache(
    async () => prisma.siteText.findMany({ select: { key: true, value: true } }),
    ["site-words"],
    { revalidate: 300 },
  );
  const [imgs, words] = await Promise.all([getHeroIds().catch(() => []), getWords().catch(() => [] as { key: string; value: string }[])]);
  const w = Object.fromEntries(words.map((r) => [r.key, r.value]));
  const heroTitle = w.hero_title || "Youth Desk NJSMA";
  const heroSub =
    w.hero_sub ||
    "One place for the municipality's young people: report an issue, get a case number, track it until it is resolved, and find training and job opportunities.";
  const choices: [string, string, string][] = [
    ["/report", w.c1t || "Report an issue", w.c1b || "Walk-in or from your phone - anonymous or with your name. You receive a case number instantly."],
    ["/track", w.c2t || "Track your case", w.c2b || "Enter your case number to see whether it is received, in progress, resolved, or forwarded."],
    ["/programs", w.c3t || "About & opportunities", w.c3b || "Departments and services of the Assembly, plus training, jobs and scholarships announced by the desk."],
  ];
  const firstHero = imgs[0]?.id;
  return (
    <>
      {firstHero && (
        <link rel="preload" as="image" href={`/api/media/${firstHero}`} fetchPriority="high" />
      )}
      <TopBar />
      <div className={"landing-band" + (imgs.length > 0 ? " hero-w-bg" : "")}>
        {imgs.length > 0 && (
          <div className="hero-bg" aria-hidden="true">
            <Slideshow images={imgs.map((i) => i.id)} alt="" priority={true} />
          </div>
        )}
        <div className="hero" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1>{heroTitle}</h1>
          <p>{heroSub}</p>
          <a href="/report" className="btn btn-primary" style={{ background: "#fff", color: "#1c3f6e" }}>Report an issue</a>
        </div>
      </div>
      <main className="main">
        <div className="card">
          <h2>What you can do here</h2>
          <div className="choice">
            {choices.map(([href, title, body]) => (
              <a key={href} href={href}><b>{title}</b><span>{body}</span></a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
