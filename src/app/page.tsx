import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import NewsRemoveButton from "@/components/NewsRemoveButton";
import TopBar from "@/components/Shell";
import NewsTicker from "@/components/NewsTicker";
import ProgrammesOpen from "@/components/ProgrammesOpen";
import Slideshow from "@/components/Slideshow";
import { getSeal } from "@/lib/seal";

// Live municipal data: render per request (cacheComponents-compatible).
export const instant = false;

export default async function Home() {
  // Officer-only inline controls: the officer who is signed in can remove news
  // directly from the main page; visitors never see the buttons.
  const officer = !!verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const seal = await getSeal();
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
  const firstHero = imgs[0]?.id;
  // Three action cards (Design 1 - modern civic): Report / Track / Programmes.
  // Titles and bodies follow the officer's Content-tab words (c1t/c1b etc).
  const tiles: { href: string; icon: string; top: string; title: string; body: string; cta: string }[] = [
    { href: "/report", icon: "📋", top: "var(--navy)", title: w.c1t || "Report an issue", body: w.c1b || "Walk-in or from your phone, anonymous or with your name. You receive a case number instantly.", cta: "Start a report" },
    { href: "/track", icon: "🔍", top: "var(--gold)", title: w.c2t || "Track your case", body: w.c2b || "See exactly where your case has gotten to: received, in progress, forwarded or resolved.", cta: "Track a case" },
    { href: "/programs", icon: "\u2713", top: "var(--navy-800, var(--navy))", title: w.c3t || "About & opportunities", body: w.c3b || "Departments and services of the Assembly, plus training, jobs and scholarships announced by the desk.", cta: "Open programmes" },
  ];
  return (
    <>
      {firstHero && (
        <link rel="preload" as="image" href={`/api/media/${firstHero}`} fetchPriority="high" />
      )}
      <TopBar />
      {/* SPLIT HERO (Design 1): left = words + actions, right = the officer slideshow */}
      <div className="hero-wrap">
        <div className="hero-left">
          <div className="hero-eyebrow">YOUTH DESK NJSMA</div>
          <h1 className="hero-h1">{heroTitle}</h1>
          <p className="hero-sub">{heroSub}</p>
          <div className="hero-cta">
            <a href="/report" className="hero-btn-solid">Report an issue</a>
            <a href="/track" className="hero-btn-ghost">Track a case</a>
          </div>
        </div>
        <div className="hero-right" aria-label="Life at the Youth Desk">
          {imgs.length > 0 ? (
            <div className="hero-shot">
              <Slideshow images={imgs.map((i) => i.id)} alt="" priority={true} />
            </div>
          ) : (
            seal ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={"/api/media/" + seal.id} alt="Assembly seal" style={{ width: 180, height: 180, objectFit: "contain", borderRadius: "50%", boxShadow: "0 6px 20px rgba(0,0,0,.25)" }} />
            ) : (
              <div className="hero-shot" style={{ opacity: 0.35 }} />
            )
          )}
        </div>
      </div>
      {news.length > 0 && (
        <NewsTicker items={(news.filter((n) => n.important).length > 0 ? news.filter((n) => n.important) : news).slice(0, 6).map((n) => ({ id: n.id, title: n.title }))} />
      )}
      {/* THREE ACTION CARDS */}
      <div className="tiles3">
        {tiles.map((t) => (
          <div key={t.href} className="tile3" style={{ borderTopColor: t.top }}>
            <div className="tile3-ico">{t.icon}</div>
            <h3>{t.title}</h3>
            <p>{t.body}</p>
            <a href={t.href}>{t.cta} &rsaquo;</a>
          </div>
        ))}
      </div>
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
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`/api/news-image/${n.images[0].id}`} alt="" loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover", borderRadius: "12px 12px 0 0", display: "block" }} />
                ) : null}
                <div style={{ background: "#fff", border: "1px solid var(--line)", borderLeft: "3px solid var(--gold)", borderRadius: n.images[0] ? "0 0 12px 12px" : 12, padding: "14px 16px", position: "relative" }}>
                  {officer && (
                    <div style={{ position: "absolute", top: 10, right: 12 }}>
                      <NewsRemoveButton id={n.id} title={n.title} />
                    </div>
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--muted)", letterSpacing: 0.5, paddingRight: officer ? 70 : 0 }}>{new Date(n.created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                  <h3 style={{ margin: "6px 0 6px", fontSize: 16, color: "var(--ink)" }}>{n.title}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--text)" }}>{n.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <ProgrammesOpen />
      <footer className="main" style={{ paddingBottom: 30 }}>
        <div className="foot-strip">
          <b>Youth Desk NJSMA</b>
          <span>A service of the New Juaben South Municipal Assembly · Every case gets a number; nothing is lost.</span>
        </div>
      </footer>
    </>
  );
}
