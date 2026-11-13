// Server-rendered newsflash ticker (CSS marquee, no client JS). Shows the
// officer-marked IMPORTANT announcements; falls back to the latest titles
// when nothing is flagged important. Duplicated track = seamless loop.
type Item = { id: number; title: string };

export default function NewsTicker({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  const seq: React.ReactNode[] = [];
  for (const dup of [0, 1]) {
    seq.push(
      <span key={"t" + dup} aria-hidden={dup === 1}>
        {items.map((n) => (
          <span key={dup + "-" + n.id} className="tickeritem">• {n.title}</span>
        ))}
      </span>
    );
  }
  return (
    <div className="tickerband" aria-label="Important announcements">
      <span className="tickerlabel">ANNOUNCEMENTS</span>
      <div className="ticker">
        <div className="tickertrack">{seq}</div>
      </div>
    </div>
  );
}
