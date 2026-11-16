import { Suspense } from "react";
import TrackInner from "./TrackInner";
import PaperHead from "@/components/PaperHead";

export default function Track() {
  return (
    <Suspense fallback={<main><PaperHead /><div className="main" style={{ maxWidth: 560 }}><div className="card">Loading…</div></div>
      <footer className="paper-foot">
        <span><b>Youth Desk NJSMA</b> &mdash; New Juaben South Municipal Assembly</span>
                <span className="footrow" style={{ display: "block", marginTop: 6, fontSize: 12 }}>
    <a href="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy</a>
    {" "}&middot;{" "}
    <a href="/terms" style={{ color: "underline", textDecoration: "underline" }}>Terms</a>
  </span>
</footer>
</main>}>
      <TrackInner />
    </Suspense>
  );
}
