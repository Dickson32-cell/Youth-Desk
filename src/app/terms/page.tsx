import PaperHead from "@/components/PaperHead";

export const metadata = {
  title: "Terms of Use - Youth Desk NJSMA",
};

export default function Terms() {
  return (
    <>
      <PaperHead active="" />
      <main className="main" style={{ maxWidth: 760 }}>
        <div className="card" style={{ lineHeight: 1.7, fontSize: 14.5 }}>
          <h1 style={{ fontSize: 20, color: "#122447", marginBottom: 4 }}>Terms of Use</h1>
          <p className="sub" style={{ marginTop: 0 }}>Youth Desk NJSMA - New Juaben South Municipal Assembly. Last updated: November 2026.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>What this service is</h2>
          <p>The Youth Desk is the Assembly&#39;s front door for young people. Through this website you can report an issue, track that case with your private key, view the desk&#39;s resolution, register for programmes, and see useful official links. It is a case-record and tracking system: it does not handle money, pay compensation or make final Assembly decisions.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>This is not an emergency service</h2>
          <p>If life or property is in danger right now, call the Ghana Police on 191 (or 18555) or the Ambulance Service on 112 first. Report online afterwards if you want the desk to follow it up.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Your tracking key</h2>
          <p>Your case has a number and a private tracking key. The key is your confidential access to the case - treat it like a password. Anyone who holds the number AND the key can read the case page. If your phone is lost, come to the desk with your case number and identification.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Fair use</h2>
          <p>Do not file false reports, abusive or repeated junk submissions, or anything unlawful. Officers may mark such entries as junk and delete them (deleted case numbers are never reused). Evidence you upload must be yours or lawfully obtained, and must not be unlawful content.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Anonymous reports</h2>
          <p>You may leave your name out. Anonymous cases can be worked on normally, but without a phone number the desk cannot send you automatic updates; you would track it with the number and key alone.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Officer authority</h2>
          <p>Youth Desk officers act under the Municipal Coordinating Director. Sensitive matters are escalated to the Department of Social Welfare or DOVVSU where protection is needed.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Changes</h2>
          <p>The Assembly may update these terms and the privacy policy as the desk grows. The date above shows the latest version. Use of the website means you accept the current terms.</p>

          <p style={{ fontSize: 12.5, color: "#5b6b86" }}>Youth Desk NJSMA operates under the laws of the Republic of Ghana and the New Juaben South Municipal Assembly.</p>
        </div>
      </main>
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
        <span style={{ display: "block", marginTop: 6, fontSize: 12 }}>
          <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy</a>
          {" "}&middot;{" "}
          <a href="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms</a>
        </span>
      </footer>
    </>
  );
}
