export const DEFAULT_SEAT_CACHE_TTL_SECONDS = 600;

export function getSeatRefreshSecondsRemaining(
  cachedAtSeconds,
  cacheTtlSeconds,
  nowMs = Date.now()
) {
  if (!cachedAtSeconds || !cacheTtlSeconds) return null;

  const nextRefreshAt = cachedAtSeconds + cacheTtlSeconds;
  const remaining = Math.ceil(nextRefreshAt - nowMs / 1000);
  return Math.max(0, remaining);
}

export function formatSeatRefreshCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
