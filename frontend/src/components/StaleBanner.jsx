import { useState } from "react";

export default function StaleBanner({ isStale, cachedAtMinutesAgo }) {
  const [dismissed, setDismissed] = useState(false);

  if (!isStale || dismissed) return null;

  return (
    <div className="bg-bison-gold/25 text-bison-brown border-b border-bison-gold/50">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-start gap-3">
        <div className="mt-0.5">
          <div className="font-semibold">Aurora is currently unreachable</div>
          <div className="text-sm">
            Showing data from{" "}
            {cachedAtMinutesAgo != null ? `${cachedAtMinutesAgo} minutes ago` : "earlier"}.
          </div>
        </div>
        <button
          className="ml-auto text-sm px-2 py-1 rounded bg-bison-gold/40 hover:bg-bison-gold/60 text-bison-brown font-medium"
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
