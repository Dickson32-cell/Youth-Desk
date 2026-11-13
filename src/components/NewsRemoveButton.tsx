"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Inline remove for officer sessions only (the server renders this button only
// when a valid officer cookie streamed the page). One tap: confirm -> DELETE ->
// refresh so the news disappears from the main page immediately.
export default function NewsRemoveButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-sm btn-danger noprint"
      disabled={busy}
      style={{ opacity: busy ? 0.6 : 1 }}
      onClick={async () => {
        if (!window.confirm(`Remove "${title.slice(0, 60)}${title.length > 60 ? "…" : ""}" from the website? Its photos go too.`)) return;
        setBusy(true);
        try {
          const res = await fetch(`/api/admin/news?id=${id}`, { method: "DELETE" });
          if (res.ok) router.refresh();
          else window.alert("Could not remove");
        } finally {
          setBusy(false);
        }
      }}
      title="Remove this news from the website"
      aria-label="Remove this news"
    >
      Remove
    </button>
  );
}
