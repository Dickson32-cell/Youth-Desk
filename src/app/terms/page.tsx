import { prisma } from "@/lib/db";
import PaperHead from "@/components/PaperHead";
import { DEFAULT_POLICIES, policyBlocks } from "@/lib/policies";

export const metadata = {
  title: "Terms of Use - Youth Desk NJSMA",
};

export const instant = false;

export default async function Terms() {
  const rows = await prisma.siteText.findMany({ select: { key: true, value: true } });
  const w: Record<string, string> = {};
  for (const r of rows) w[r.key] = r.value;
  const source = w.policy_terms_body || DEFAULT_POLICIES.terms;
  return (
    <>
      <PaperHead active="" />
      <main className="main" style={{ maxWidth: 760 }}>
        <div className="card" style={{ lineHeight: 1.7, fontSize: 14.5 }}>
          <h1 style={{ fontSize: 20, color: "#122447", marginBottom: 4 }}>Terms of Use</h1>
          <p className="sub" style={{ marginTop: 0 }}>Youth Desk NJSMA — New Juaben South Municipal Assembly. Last updated: November 2026.</p>
          {policyBlocks(source)}
        </div>
      </main>
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
        <span style={{ display: "block", marginTop: 6, fontSize: 12 }}>
          <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Terms</a>
        </span>
      </footer>
    </>
  );
}
