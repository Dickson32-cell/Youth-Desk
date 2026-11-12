import Link from "next/link";

export function TopBar({ on }: { on?: "report" | "track" | "programs" | "home" }) {
  return (
    <header className="topbar">
      <div className="bar">
        <div>
          <div className="logo-t">Youth Desk</div>
          <div className="logo-s">MUNICIPAL ASSEMBLY</div>
        </div>
        <span className="sp" />
        <Link href="/" className={"navbtn" + (on === "home" ? " on" : "")}>Home</Link>
        <Link href="/report" className={"navbtn" + (on === "report" ? " on" : "")}>Report an issue</Link>
        <Link href="/track" className={"navbtn" + (on === "track" ? " on" : "")}>Track case</Link>
        <Link href="/programs" className={"navbtn" + (on === "programs" ? " on" : "")}>Opportunities</Link>
      </div>
    </header>
  );
}

export function Footer() {
  return <div className="footer">Youth Desk — Municipal Assembly. Every case gets a number; nothing is lost.</div>;
}

export default TopBar;
