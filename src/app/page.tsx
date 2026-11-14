import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import NewsRemoveButton from "@/components/NewsRemoveButton";
import NewsTicker from "@/components/NewsTicker";
import ProgrammesOpen from "@/components/ProgrammesOpen";
import Slideshow from "@/components/Slideshow";
import PaperHead from "@/components/PaperHead";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Home() {
  // Officer-only inline controls: the officer can remove news from the main page.
  const officer = !!verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const [imgs, words, newsRaw] = await Promise.all([
    prisma.siteImage.findMany({ where: { slot: "hero" }, orderBy: { sort: "asc" }, select: { id: true } }).catch(() => [] as { id: number }[]),
    prisma.siteText.findMany({ select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]),
    prisma.news.findMany({
      orderBy: { id: "desc" },
      take: 8,
      select: { id: true, title: true, body: true, important: true, createdAt: true, images: { select: { id: true, mimeType: true }, orderBy: { sort: "asc" } } },
    }).catch(() => [] as { id: number; title: string; body: string; important: boolean; createdAt: Date; images: { id: number; mimeType: string }[] }[]),
  ]);
  const news = newsRaw.map((n) => ({ ...n, created: n.createdAt.toISOString() }));
  const w = Object.fromEntries(words.map((r) => [r.key, r.value]));
  const heroTitle = w.hero_title || "Youth Desk NJSMA";
  const heroSub =
    w.hero_sub ||
    "One place for the municipality's young people: report an issue, get a case number, track it until it is resolved, and find training and job opportunities.";
  const firstHero = imgs[0]?.id;
  return (
    <>
      {firstHero && <link rel="preload" as="image" href={`/api/media/${firstHero}`} fetchPriority="high" />}

      <PaperHead active="HOME" />

      {/* Lower deck: lede / photo / how-it-works */}
      <div className="paper-deck">
        <div className="paper-lede">
          <h2>{w.hero_title || "One desk for the municipality's young people"}</h2>
          <p>{heroSub}</p>
          <a href="/report">Report an issue <i aria-hidden="true">&rarr;</i></a>
          <a href="/track">{w.c2t || "Track a case"} <i aria-hidden="true">&rarr;</i></a>
          <a href="/programs">{w.c3t || "Open programmes"} <i aria-hidden="true">&rarr;</i></a>
        </div>
        <div className="paper-photo">
          <div className="paper-photo-in">
            {imgs.length > 0 && <Slideshow images={imgs.map((i) => i.id)} alt="" priority={true} />}
          </div>
          <div className="paper-photo-cap">AT THE DESK &mdash; {new Date().getFullYear()}</div>
        </div>
      </div>

      <NewsTicker items={(news.filter((n) => n.important).length > 0 ? news.filter((n) => n.important) : news).slice(0, 6).map((n) => ({ id: n.id, title: n.title }))} />

      {/* Latest news: featured + list, newspaper style */}
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
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
              </footer>
    </>
  );
}
