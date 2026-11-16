import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import Link from "next/link";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
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
  const [imgs, words, newsRaw, linkRows] = await Promise.all([
    prisma.siteImage.findMany({ where: { slot: "hero" }, orderBy: { sort: "asc" }, select: { id: true } }).catch(() => [] as { id: number }[]),
    prisma.siteText.findMany({ select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]),
    prisma.news.findMany({
      orderBy: { id: "desc" },
      take: 8,
      select: { id: true, title: true, body: true, important: true, createdAt: true, images: { select: { id: true, mimeType: true }, orderBy: { sort: "asc" } } },
    }).catch(() => EMPTY_NEWS),
    prisma.siteItem.findMany({ where: { kind: "link" }, orderBy: { id: "asc" }, select: { id: true, title: true, body: true } }).catch(() => [] as { id: number; title: string; body: string }[]),
  ]);
  const news = newsRaw.map((n) => ({ ...n, created: n.createdAt.toISOString() }));
  const w = Object.fromEntries(words.map((r) => [r.key, r.value]));
  const heroTitle = w.hero_title || "Speak up. Track it. Get results.";
  const heroSub =
    w.hero_sub ||
    "The Youth Desk connects young people in New Juaben South to the Assembly, from reporting an issue to seeing it resolved.";
  const firstHero = imgs[0]?.id;
  return (
    <main>
      {firstHero && <link rel="preload" as="image" href={`/api/media/${firstHero}`} fetchPriority="high" />}

      <PaperHead active="HOME" />

      <div className="main">
        <section className={"wise-hero" + (imgs.length > 0 ? " hasphotos" : "")}>
          {imgs.length > 0 && (
            <div className="herobg" aria-hidden="true">
              <Slideshow images={imgs.map((i) => i.id)} alt="" priority={true} />
              <div className="heroscrim" />
            </div>
          )}
          <div className="herotext">
            <h1>{heroTitle}</h1>
            <p className="herosub">{heroSub}</p>
            <div className="hero-cta">
              <Link href="/report" className="btn btn-primary">Report an issue</Link>
              <Link href="/track" className="btn btn-ghost">Track a case</Link>
            </div>
          </div>
        </section>

        <section className="wise-links">
          <Link href="/report" className="lk"><div><b>{w.card1_t || "Report an issue"}</b><span>{w.card1_d || "Tell the desk what happened. Anonymous is welcome."}</span><em>{w.card1_c || "Open the form"} &rarr;</em></div></Link>
          <Link href="/track" className="lk"><div><b>{w.card2_t || "Track a case"}</b><span>{w.card2_d || "Enter your case number and see where it stands today."}</span><em>{w.card2_c || "Track it"} &rarr;</em></div></Link>
          <Link href="/programs" className="lk"><div><b>{w.card3_t || "Departments & services"}</b><span>{w.card3_d || "Every department of the Assembly, one tap each."}</span><em>{w.card3_c || "See them all"} &rarr;</em></div></Link>
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
                </div>
              )}
              <div className="paper-col">
                {news.slice(1, 4).map((n) => (
                  <div key={n.id} className="paper-col-it">
                    <span>{new Date(n.created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</span>
                    <b className="serif">{n.title}</b>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <ProgrammesOpen />

        {linkRows.length > 0 && (
          <section className="paper-links" id="links">
            <h3 className="paper-sect">Useful links <span>OFFICER-PICKED</span></h3>
            <div className="wise-links">
              {linkRows.map((l) => (
                <a key={l.id} href={l.body} target="_blank" rel="noopener noreferrer nofollow" className="lk">
                  <div>
                    <b>{l.title}</b>
                    <span>{(() => { try { return new URL(l.body).hostname.replace(/^www\./, ""); } catch { return l.body.slice(0, 60); } })()}</span>
                    <em>Open &rarr;</em>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
      </footer>
    </main>
  );
}
