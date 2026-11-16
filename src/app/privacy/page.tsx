import PaperHead from "@/components/PaperHead";

export const metadata = {
  title: "Privacy Policy - Youth Desk NJSMA",
};

// Plain-language privacy statement for the citizens using the desk.
export default function Privacy() {
  return (
    <>
      <PaperHead active="" />
      <main className="main" style={{ maxWidth: 760 }}>
        <div className="card" style={{ lineHeight: 1.7, fontSize: 14.5 }}>
          <h1 style={{ fontSize: 20, color: "#122447", marginBottom: 4 }}>Privacy Policy</h1>
          <p className="sub" style={{ marginTop: 0 }}>Youth Desk NJSMA - New Juaben South Municipal Assembly. Last updated: November 2026.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>What we collect</h2>
          <p>When you report at the desk or online we record: your name (optional - you may report anonymously), your phone number (optional, used only to give you SMS updates on your case), your area, the type of issue, your description of what happened, and any photos or files you attach as evidence. When you sign up for a programme we record your name, phone and area so we can reach you about it.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Why we collect it</h2>
          <p>Only so the Youth Desk officer can log your issue, take it to the right Assembly department and follow it through to a resolution, and so we can tell you what is happening on your case.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Who can see it</h2>
          <p>Only the Youth Desk officers sign in and work on cases. Where your case is forwarded, the relevant Assembly department receives the details it needs through official referral letters. No other member of the public can see your case: a case opens only with BOTH its number and its private tracking key. Keep your key to yourself - do not share it.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Where it is kept</h2>
          <p>The records live in a dedicated, private database hosted on a professional cloud service (Neon PostgreSQL, served through Vercel), each client assembly in its own sealed database. Records belong to the New Juaben South Municipal Assembly. No money is ever collected or held through this system.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Sensitive cases</h2>
          <p>Reports of abuse or domestic matters can be made anonymously. Where the officer decides a case needs protection services, it is escalated to the Department of Social Welfare and/or DOVVSU in line with Ghanaian law (Children&#39;s Act, Domestic Violence Act), always with care for your safety.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>How long we keep records</h2>
          <p>Cases are kept as long as the Assembly needs them for its records and reporting. If you want information about your case corrected or removed, contact the Youth Desk office with your case number and tracking key.</p>

          <h2 className="serif" style={{ fontSize: 16, color: "#122447" }}>Contact</h2>
          <p>Youth Desk Office, New Juaben South Municipal Assembly, Koforidua. Or track your case any time on this website with your number and key.</p>
        </div>
      </main>
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
      </footer>
    </>
  );
}
