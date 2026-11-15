import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import NewsRemoveButton from "@/components/NewsRemoveButton";
import NewsTicker from "@/components/NewsTicker";
import ProgrammesOpen from "@/components/ProgrammesOpen";
import Slideshow from "@/components/Slideshow";
import PaperHead from "@/components/PaperHead";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

type NewsRow = { id: number; title: string; body: string; important: boolean; createdAt: Date; images: { id: number; mimeType: string }[] };
const EMPTY_NEWS: NewsRow[] = [];

export default async function Home() {
  // Officer-only inline controls: the officer can remove news from the main page.
  const officer = !!verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const [imgs, words, newsRaw, resolved, openCases, depts, progOpen] = await Promise.all([
    prisma.siteImage.findMany({ where: { slot: "hero" }, orderBy: { sort: "asc" }, select: { id: true } }).catch(() => [] as { id: number }[]),
    prisma.siteText.findMany({ select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]),
    prisma.news.findMany({
      orderBy: { id: "desc" },
      take: 8,
      select: { id: true, title: true, body: true, important: true, createdAt: true, images: { select: { id: true, mimeType: true }, orderBy: { sort: "asc" } } },
    }).catch(() => EMPTY_NEWS),
    prisma.case.count({ where: { status: "RESOLVED" } }).catch(() => 0),
    prisma.case.count({ where: { status: { not: "RESOLVED" } } }).catch(() => 0),
    prisma.siteItem.count({ where: { kind: "department" } }).catch(() => 0),
    prisma.program.count({ where: { status: "OPEN" } }).catch(() => 0),
  ]);
  const news = newsRaw.map((n) => ({ ...n, created: n.createdAt.toISOString() }));
  const w = Object.fromEntries(words.map((r) => [r.key, r.value]));
  const heroTitle = w.hero_title || "One desk for the municipality's young people";
  const heroSub =
    w.hero_sub ||
    "Report an issue, get a case number, track it until it is resolved, and find training and job opportunities.";
  const firstHero = imgs[0]?.id;
  return (
    <main>
      {firstHero && <link rel="preload" as="image" href={`/api/media/${firstHero}`} fetchPriority="high" />}

      <PaperHead active="HOME" />

      <div className="main">
        <section className="wise-hero">
          <div>
            <h1>{heroTitle}</h1>
            <p className="herosub">{heroSub}</p>
            <div className="hero-cta">
              <Link href="/report" className="btn btn-primary">Report an issue</Link>
              <Link href="/track" className="btn btn-ghost">Track a case</Link>
            </div>
          </div>
          <div className="photoin">
            {imgs.length > 0 && <Slideshow images={imgs.map((i) => i.id)} alt="" priority={true} />}
          </div>
        </section>

        <section className="wise-stats">
          <div className="st"><b>{resolved}</b><span>CASES RESOLVED</span></div>
          <div className="st"><b>{openCases}</b><span>CASES IN PROGRESS</span></div>
          <div className="st"><b>{depts}</b><span>ASSEMBLY DEPARTMENTS</span></div>
          <div className="st"><b>{progOpen}</b><span>OPEN PROGRAMMES</span></div>
        </section>

        <section className="wise-links">
          <Link href="/report" className="lk"><img src="/api/seal" alt="" /><div><b>Report an issue</b><span>Tell the desk what happened. Anonymous is welcome.</span><em>Open the form &rarr;</em></div></Link>
          <Link href="/track" className="lk"><img src="/api/seal" alt="" /><div><b>Track a case</b><span>Enter your case number and see where it stands today.</span><em>Track it &rarr;</em></div></Link>
          <Link href="/programs" className="lk"><img src="/api/seal" alt="" /><div><b>Departments &amp; services</b><span>Every department of the Assembly, one tap each.</span><em>See them all &rarr;</em></div></Link>
        </section>

        <NewsTicker items={(news.filter((n) => n.important).length > 0 ? news.filter((n) => n.important) : news).slice(0, 6).map((n) => ({ id: n.id, title: n.title }))} />

        {news.length > 0 && (
          <section className="paper-news" id="news">
            <h3 className="paper-sect">Latest news <span>FROM THE ASSEMBLY</span></h3>
            <div className="paper-newsgrid">
              {news[0] && (
                <div className="paper-feat">
                  {news[0].images.length > 0 && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={`/api/news-image/${news[0].images[0].id}`} alt="" loading="lazy" />
                  )}
                  <b className="serif">{news[0].title}</b>
                  {news[0].body?.trim() && <p>{news[0].body.length > 260 ? news[0].body.slice(0, 257).trimEnd() + "..." : news[0].body}</p>}
                  <div className="paper-feat-date">{new Date(news[0].created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                  {officer && <div className="paper-remove-in"><NewsRemoveButton id={news[0].id} title={news[0].title} /></div>}
                </div>
              )}
              <div className="paper-col">
                {news.slice(1, 4).map((n) => (
                  <div key={n.id} className="paper-col-it">
                    <span>{new Date(n.created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</span>
                    <b className="serif">{n.title}</b>
                    {officer && <div className="paper-remove-in"><NewsRemoveButton id={n.id} title={n.title} /></div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <ProgrammesOpen />
      </div>
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
      </footer>
    </main>
  );
}
