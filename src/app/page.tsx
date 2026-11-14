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
  // Numbered services (editorial ledger, derived from the Desk's printed slips)
  const rows = [
    { n: "01", href: "/report", t: w.c1t || "Report an issue", d: w.c1b || "Walk-in or from your phone - anonymous if you choose. A case number is issued the moment you finish.", a: "Report an issue" },
    { n: "02", href: "/track", t: w.c2t || "Track a case", d: w.c2b || "Every case moves on the record: received, in progress, forwarded, resolved.", a: "Track a case" },
    { n: "03", href: "/programs", t: w.c3t || "Programmes & opportunities", d: w.c3b || "Training, mentorship, internships and grants - announced here, registered online.", a: "Open programmes" },
  ];
  return (
    <>
      {firstHero && (
        <link rel="preload" as="image" href={`/api/media/${firstHero}`} fetchPriority="high" />
      )}
      <TopBar />

      {/* Editorial masthead - same grammar as the Desk's printed letterhead */}
      <div className="pub-mast">
        {seal ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="pub-mast-seal" src={"/api/media/" + seal.id} alt="Assembly seal" />
        ) : null}
        <div className="pub-mast-words">
          <span className="mast-line1">YOUTH DESK</span>
          <span className="mast-line2">NEW JUABEN SOUTH · MUNICIPAL ASSEMBLY</span>
        </div>
        <span className="pub-mast-no">EST. MUNICIPAL SERVICE<br/>COMPLAINTS · PROGRAMMES · RECORDS</span>
      </div>
      <div className="pub-rule" />

      {/* Hero - the notice-board field, with the case slip as the artefact */}
      <div className="pub-hero">
        <div className="pub-hero-left">
          <h1>{heroTitle}</h1>
          <p>{heroSub}</p>
          <div className="pub-hero-links">
            <a href="/report">Report an issue <span aria-hidden="true">→</span></a>
            <a href="/track">Track a case <span aria-hidden="true">→</span></a>
          </div>
        </div>
        <div className="pub-hero-right">
          {imgs.length > 0 && (
            <div className="pub-photo">
              <Slideshow images={imgs.map((i) => i.id)} alt="" priority={true} />
              <div className="pub-photo-cap">AT THE DESK — {new Date().getFullYear()}</div>
            </div>
          )}
          <div className="pub-slip">
            <div className="slip-head">HOW THE DESK WORKS</div>
            <div className="slip-step"><b>1.</b><span>Report an issue on this site or at the desk.</span></div>
            <div className="slip-step"><b>2.</b><span>You get a case number by SMS.</span></div>
            <div className="slip-step"><b>3.</b><span>Track it any time with your private key.</span></div>
            <div className="slip-note">Complaints are confidential - only you and the desk officer can see your case.</div>
          </div>
        </div>
      </div>
      {news.length > 0 && (
        <NewsTicker items={(news.filter((n) => n.important).length > 0 ? news.filter((n) => n.important) : news).slice(0, 6).map((n) => ({ id: n.id, title: n.title }))} />
      )}

      {/* Numbered services ledger */}
      <div className="pub-services">
        {rows.map((r) => (
          <a key={r.href} href={r.href} className="svc-row">
            <span className="svc-n">{r.n}</span>
            <span className="svc-body"><b>{r.t}</b><span>{r.d}</span></span>
            <span className="svc-cta">{r.a} <i aria-hidden="true">→</i></span>
          </a>
        ))}
      </div>

      {news.length > 0 && (
        <section className="main newssection" id="news">
          <h2 className="newsh">Latest news</h2>
          <div className="newsgrid">
            {news.slice(0, 3).map((n) => (
              <article key={n.id} style={{ margin: 0 }}>
                {n.images.length > 1 ? (
                  <div style={{ height: 170, overflow: "hidden", borderRadius: "0 0 0 0" }}>
                    <Slideshow images={n.images.filter((im) => String(im.mime).startsWith("image/")).map((im) => im.id)} alt={n.title} srcPrefix="/api/news-image" />
                  </div>
                ) : n.images[0] && String(n.images[0].mime).startsWith("image/") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`/api/news-image/${n.images[0].id}`} alt="" loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }} />
                ) : null}
                <div style={{ background: "#fff", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "14px 16px", position: "relative" }}>
                  {officer && (
                    <div style={{ position: "absolute", top: 10, right: 12 }}>
                      <NewsRemoveButton id={n.id} title={n.title} />
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: 0.6, paddingRight: officer ? 70 : 0, textTransform: "uppercase" }}>{new Date(n.created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
                  <h3 style={{ margin: "6px 0 6px", fontSize: 16.5, color: "var(--ink)", fontFamily: "Georgia, serif" }}>{n.title}</h3>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--text)" }}>{n.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <ProgrammesOpen />
      <footer className="pub-foot">
        <div><b>Youth Desk NJSMA</b> — New Juaben South Municipal Assembly</div>
        <div>Every case gets a number; nothing is lost.</div>
      </footer>
    </>
  );
}
