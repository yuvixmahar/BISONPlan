import useSeatRefreshCountdown from "../hooks/useSeatRefreshCountdown.js";
import { DEFAULT_SEAT_CACHE_TTL_SECONDS, formatSeatRefreshCountdown } from "../utils/seatRefresh.js";

export default function SeatRefreshCounter({
  cachedAt,
  cacheTtlSeconds = DEFAULT_SEAT_CACHE_TTL_SECONDS,
}) {
  const secondsRemaining = useSeatRefreshCountdown(cachedAt, cacheTtlSeconds);

  if (secondsRemaining == null) return null;

  const countdownLabel =
    secondsRemaining > 0
      ? formatSeatRefreshCountdown(secondsRemaining)
      : null;

  return (
    <div className="mt-2 text-xs text-bison-text-muted">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-bison-border bg-white px-2.5 py-1 shadow-sm">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            secondsRemaining > 0 ? "bg-bison-gold" : "bg-bison-text-muted/50"
          }`}
          aria-hidden="true"
        />
        {countdownLabel ? (
          <>
            Seats refresh in{" "}
            <span className="font-medium tabular-nums text-bison-text">{countdownLabel}</span>
          </>
        ) : (
          <span>Seat counts may be stale — reselect the department for the latest data.</span>
        )}
      </span>
    </div>
  );
}
