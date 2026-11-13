import { prisma } from "@/lib/db";
import TopBar from "@/components/Shell";

// Public news page: every announcement the desk has posted, newest first.
// Linked from the main menu as the "News" tab, so its entry point always
// exists even before the first bulletin is posted (the main page's ticker
// and cards follow the same data).
export const instant = false;

export default async function News() {
  const news = await prisma.news.findMany({
    orderBy: { id: "desc" },
    include: { images: { select: { id: true, mimeType: true }, orderBy: { sort: "asc" } } },
  });

  return (
    <main>
      <TopBar on="news" />
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
            {n.images[0] && String(n.images[0].mimeType).startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/news-image/${n.images[0].id}`}
                alt=""
                style={{ width: "100%", maxHeight: 380, objectFit: "cover", display: "block" }}
              />
            )}
            <div style={{ padding: "16px 18px" }}>
              <div style={{ fontSize: 11.5, color: "#8fa2bd", letterSpacing: 0.5 }}>
                {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <h3 style={{ margin: "6px 0 8px", fontSize: 18, color: "#12294a" }}>{n.title}</h3>
              {n.images.length > 1 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {n.images.slice(1).filter((im) => String(im.mimeType).startsWith("image/")).map((im) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={im.id} src={`/api/news-image/${im.id}`} alt="" loading="lazy" style={{ width: 96, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #e3e9f2" }} />
                  ))}
                </div>
              )}
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: "#3c5170", whiteSpace: "pre-wrap" }}>{n.body}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
