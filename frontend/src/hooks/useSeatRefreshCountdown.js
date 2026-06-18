import { useEffect, useMemo, useState } from "react";
import { getSeatRefreshSecondsRemaining } from "../utils/seatRefresh.js";

export default function useSeatRefreshCountdown(cachedAt, cacheTtlSeconds) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(
    () => getSeatRefreshSecondsRemaining(cachedAt, cacheTtlSeconds, now),
    [cachedAt, cacheTtlSeconds, now]
  );
}
