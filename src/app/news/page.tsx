import { prisma } from "@/lib/db";
import PaperHead from "@/components/PaperHead";
import NewsTicker from "@/components/NewsTicker";
import Slideshow from "@/components/Slideshow";

// Public news page: every announcement the desk has posted, newest first.
// The important-announcements ticker sits above the list; an item with several
// photos gets a slideshow instead of stacked images.
export const instant = false;

export default async function News() {
  const news = await prisma.news.findMany({
    orderBy: { id: "desc" },
    include: { images: { select: { id: true, mimeType: true }, orderBy: { sort: "asc" } } },
  });
  const tickerItems = (news.filter((n) => n.important).length > 0 ? news.filter((n) => n.important) : news)
    .slice(0, 6)
    .map((n) => ({ id: n.id, title: n.title }));

  return (
    <main>
      <PaperHead active="NEWS" />
      {tickerItems.length > 0 && <NewsTicker items={tickerItems} />}
      <div className="main" style={{ maxWidth: 900 }}>
        <div className="card" style={{ background: "transparent", border: "none", padding: "16px 0 4px" }}>
          <h2 style={{ fontSize: 22, margin: 0 }}>News from the Assembly</h2>
          <p className="sub" style={{ margin: 0 }}>
            Official announcements from the Youth Desk of the New Juaben South Municipal Assembly.
          </p>
        </div>
        {news.length === 0 && (
          <div className="card">
            <p style={{ margin: 0, color: "#5b6b86", fontSize: 14 }}>No announcements yet. Check again soon.</p>
          </div>
        )}
        {news.map((n) => (
          <article key={n.id} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
            {n.images.length > 1 ? (
              <div className="card" style={{ padding: 0, overflow: "hidden", border: "none", marginBottom: 0 }}>
                <Slideshow
                  images={n.images.filter((im) => String(im.mimeType).startsWith("image/")).map((im) => im.id)}
                  alt={n.title}
                  srcPrefix="/api/news-image"
                />
              </div>
            ) : n.images[0] && String(n.images[0].mimeType).startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/news-image/${n.images[0].id}`}
                alt=""
                style={{ width: "100%", maxHeight: 380, objectFit: "cover", display: "block" }}
              />
            ) : null}
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {n.important && (
                  <span style={{ background: "#B88721", color: "#fff", fontWeight: 700, fontSize: 10.5, letterSpacing: 1, padding: "3px 8px", borderRadius: 6 }}>
                    IMPORTANT
                  </span>
                )}
                <span style={{ fontSize: 11.5, color: "#8fa2bd", letterSpacing: 0.5 }}>
                  {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <h3 style={{ margin: "6px 0 8px", fontSize: 18, color: "#12294a" }}>{n.title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3c5170", whiteSpace: "pre-wrap" }}>{n.body}</p>
            </div>
          </article>
        ))}
      </div>
    
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
                <span className="footrow" style={{ display: "block", marginTop: 6, fontSize: 12 }}>
    <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy</a>
    {" "}&middot;{" "}
    <a href="/terms" style={{ color: "underline", textDecoration: "underline" }}>Terms</a>
  </span>
</footer>
</main>
  );
}
