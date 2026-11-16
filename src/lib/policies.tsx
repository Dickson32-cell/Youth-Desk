// Officer-editable policy documents (Privacy + Terms). The source text is
// either the officer's override (siteText keys policy_privacy_body /
// policy_terms_body) or these built-in defaults. Rendering rules: a blank
// line starts a new paragraph; a line written wholly in CAPITALS renders as
// a subheading. Anything else is a normal paragraph.
import type { ReactNode } from "react";

export const DEFAULT_POLICIES: Record<string, string> = {
  privacy: `WHAT WE COLLECT
When you report at the desk or online we record: your name (optional - you may report anonymously), your phone number (optional, used only to give you SMS updates on your case), your area, the type of issue, your description of what happened, and any photos or files you attach as evidence. When you sign up for a programme we record your name, phone and area so we can reach you about it.

WHY WE COLLECT IT
Only so the Youth Desk officer can log your issue, take it to the right Assembly department and follow it through to a resolution, and so we can tell you what is happening on your case.

WHO CAN SEE IT
Only the Youth Desk officers sign in and work on cases. Where your case is forwarded, the relevant Assembly department receives the details it needs through official referral letters. No other member of the public can see your case: a case opens only with BOTH its number and its private tracking key. Keep your key to yourself - do not share it.

WHERE IT IS KEPT
The records live in a dedicated, private database hosted on a professional cloud service (Neon PostgreSQL, served through Vercel), each client assembly in its own sealed database. Records belong to the New Juaben South Municipal Assembly. No money is ever collected or held through this system.

SENSITIVE CASES
Reports of abuse or domestic matters can be made anonymously. Where the officer decides a case needs protection services, it is escalated to the Department of Social Welfare and/or DOVVSU in line with Ghanaian law (Children's Act, Domestic Violence Act), always with care for your safety.

HOW LONG WE KEEP RECORDS
Cases are kept as long as the Assembly needs them for its records and reporting. If you want information about your case corrected or removed, contact the Youth Desk office with your case number and tracking key.

CONTACT
Youth Desk Office, New Juaben South Municipal Assembly, Koforidua. Or track your case any time on this website with your number and key.`,
  terms: `WHAT THIS SERVICE IS
The Youth Desk is the Assembly's front door for young people. Through this website you can report an issue, track that case with your private key, view the desk's resolution, register for programmes, and see useful official links. It is a case-record and tracking system: it does not handle money, pay compensation or make final Assembly decisions.

THIS IS NOT AN EMERGENCY SERVICE
If life or property is in danger right now, call the Ghana Police on 191 (or 18555) or the Ambulance Service on 112 first. Report online afterwards if you want the desk to follow it up.

YOUR TRACKING KEY
Your case has a number and a private tracking key. The key is your confidential access to the case - treat it like a password. Anyone who holds the number AND the key can read the case page. If your phone is lost, come to the desk with your case number and identification.

FAIR USE
Do not file false reports, abusive or repeated junk submissions, or anything unlawful. Officers may mark such entries as junk and delete them (deleted case numbers are never reused). Evidence you upload must be yours or lawfully obtained, and must not be unlawful content.

ANONYMOUS REPORTS
You may leave your name out. Anonymous cases can be worked on normally, but without a phone number the desk cannot send you automatic updates; you would track it with the number and key alone.

OFFICER AUTHORITY
Youth Desk officers act under the Municipal Coordinating Director. Sensitive matters are escalated to the Department of Social Welfare or DOVVSU where protection is needed.

CHANGES
The Assembly may update these terms and the privacy policy as the desk grows. The date above shows the latest version. Use of the website means you accept the current terms.

Youth Desk NJSMA operates under the laws of the Republic of Ghana and the New Juaben South Municipal Assembly.`,
};

export function policyBlocks(source: string): ReactNode[] {
  const out: ReactNode[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 80) {
      out.push(
        <h2 key={line + out.length} className="serif" style={{ fontSize: 16, color: "#122447", marginTop: 18 }}>
          {line.charAt(0) + line.slice(1).toLowerCase()}
        </h2>,
      );
    } else {
      out.push(
        <p key={out.length} style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
          {line}
        </p>,
      );
    }
  }
  return out;
}
