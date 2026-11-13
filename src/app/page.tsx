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
  const getNews = unstable_cache(
    async () =>
      prisma.news.findMany({
        orderBy: { id: "desc" },
        take: 6,
        include: { images: { select: { id: true, mimeType: true }, orderBy: { sort: "asc" } } },
      }),
    ["landing-news"],
    { revalidate: 60, tags: ["landing-news"] },
  );
  const [imgs, words, news] = await Promise.all([
    getHeroIds().catch(() => [] as { id: number }[]),
    getWords().catch(() => [] as { key: string; value: string }[]),
    getNews().catch(() => [] as { id: number; title: string; body: string; createdAt: Date; images: { id: number; mimeType: string }[] }[]),
  ]);
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
      {news.length > 0 && (
        <div className="tickerband" aria-label="Latest municipal news">
          <span className="tickerlabel">NEWS</span>
          <div className="ticker">
            <div className="tickertrack">
              <span>
                {news.map((n) => (
                  <span key={"a" + n.id} className="tickeritem">• {n.title}</span>
                ))}
              </span>
              <span aria-hidden="true">
                {news.map((n) => (
                  <span key={"b" + n.id} className="tickeritem">• {n.title}</span>
                ))}
              </span>
            </div>
          </div>
        </div>
      )}
      {news.length > 0 && (
        <section className="main newssection" id="news">
          <h2 className="newsh">Latest news</h2>
          <div className="newsgrid">
            {news.slice(0, 3).map((n) => (
              <article key={n.id} style={{ margin: 0 }}>
                {n.images[0] && String(n.images[0].mimeType).startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/news-image/${n.images[0].id}`} alt="" loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: "12px 12px 0 0", display: "block" }} />
                )}
                <div style={{ background: "#fff", border: "1px solid #e3e9f2", borderTop: n.images[0] ? "none" : undefined, borderRadius: n.images[0] ? "0 0 12px 12px" : 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11.5, color: "#8fa2bd", letterSpacing: 0.5 }}>{new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                  <h3 style={{ margin: "6px 0 6px", fontSize: 16, color: "#12294a" }}>{n.title}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#3c5170" }}>{n.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
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
