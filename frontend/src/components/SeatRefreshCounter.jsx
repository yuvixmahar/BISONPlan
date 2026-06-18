import useSeatRefreshCountdown from "../hooks/useSeatRefreshCountdown.js";
import { DEFAULT_SEAT_CACHE_TTL_SECONDS, formatSeatRefreshCountdown } from "../utils/seatRefresh.js";

export default function SeatRefreshCounter({
  cachedAt,
  cacheTtlSeconds = DEFAULT_SEAT_CACHE_TTL_SECONDS,
  onRefresh,
  refreshing = false,
}) {
  const secondsRemaining = useSeatRefreshCountdown(cachedAt, cacheTtlSeconds);

  if (secondsRemaining == null) return null;

  const isExpired = secondsRemaining <= 0;
  const countdownLabel = !isExpired ? formatSeatRefreshCountdown(secondsRemaining) : null;

  return (
    <div className="mt-2 text-xs text-bison-text-muted">
      {isExpired ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-bison-gold/50 bg-bison-gold/10 px-2.5 py-1 text-bison-brown shadow-sm hover:bg-bison-gold/20 active:bg-bison-gold/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
          >
            <path
              d="M13.5 8A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 3.89 1.61L10 6h4V2l-1.46 1.46A7 7 0 1 0 15 8h-1.5Z"
              fill="currentColor"
            />
          </svg>
          {refreshing ? "Refreshing seats…" : "Refresh seats"}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-bison-border bg-white px-2.5 py-1 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-bison-gold" aria-hidden="true" />
          Seats refresh in{" "}
          <span className="font-medium tabular-nums text-bison-text">{countdownLabel}</span>
        </span>
      )}
    </div>
  );
}
