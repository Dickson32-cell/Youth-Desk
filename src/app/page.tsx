import { prisma } from "@/lib/db";
import TopBar from "@/components/Shell";
import NewsTicker from "@/components/NewsTicker";
import Slideshow from "@/components/Slideshow";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Home() {
  const [imgs, words, newsRaw] = await Promise.all([
    prisma.siteImage.findMany({ where: { slot: "hero" }, orderBy: { sort: "asc" }, select: { id: true } }).catch(() => [] as { id: number }[]),
    prisma.siteText.findMany({ select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]),
    prisma.news.findMany({
      orderBy: { id: "desc" },
      take: 6,
      include: { images: { select: { id: true, mimeType: true }, orderBy: { sort: "asc" } } },
    }).catch(() => [] as { id: number; title: string; body: string; important: boolean; createdAt: Date; images: { id: number; mimeType: string }[] }[]),
  ]);
  const news = newsRaw.map((n) => ({ id: n.id, title: n.title, body: n.body, important: n.important, created: n.createdAt.toISOString(), images: n.images.map((im) => ({ id: im.id, mime: im.mimeType })) }));
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
        <NewsTicker items={(news.filter((n) => n.important).length > 0 ? news.filter((n) => n.important) : news).slice(0, 6).map((n) => ({ id: n.id, title: n.title }))} />
      )}
      {news.length > 0 && (
        <section className="main newssection" id="news">
          <h2 className="newsh">Latest news</h2>
          <div className="newsgrid">
            {news.slice(0, 3).map((n) => (
              <article key={n.id} style={{ margin: 0 }}>
                {n.images.length > 1 ? (
                  <div style={{ height: 170, overflow: "hidden", borderRadius: "12px 12px 0 0" }}>
                    <Slideshow images={n.images.filter((im) => String(im.mime).startsWith("image/")).map((im) => im.id)} alt={n.title} srcPrefix="/api/news-image" />
                  </div>
                ) : n.images[0] && String(n.images[0].mime).startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/news-image/${n.images[0].id}`} alt="" loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: "12px 12px 0 0", display: "block" }} />
                ) : null}
                <div style={{ background: "#fff", border: "1px solid #e3e9f2", borderTop: n.images[0] ? "none" : undefined, borderRadius: n.images[0] ? "0 0 12px 12px" : 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11.5, color: "#8fa2bd", letterSpacing: 0.5 }}>{new Date(n.created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
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
