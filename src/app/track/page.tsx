import { Suspense } from "react";
import TrackInner from "./TrackInner";
import TopBar from "@/components/Shell";

export default function Track() {
  return (
    <Suspense fallback={<main><TopBar /><div className="main" style={{ maxWidth: 560 }}><div className="card">Loading…</div></div></main>}>
      <TrackInner />
    </Suspense>
  );
}
