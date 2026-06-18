import { useEffect, useMemo, useState } from "react";
import { getCourses } from "../api/client.js";
import { DEFAULT_SEAT_CACHE_TTL_SECONDS } from "../utils/seatRefresh.js";
export default function useCourses(subject, term, refreshTick = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState(null);

  const enabled = useMemo(() => {
    return Boolean(subject && subject.trim() && term && term.trim());
  }, [subject, term]);

  // Track whether this is a background refresh (data already loaded) vs initial load
  const hasData = data.length > 0;

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      setCacheTtlSeconds(null);
      return;
    }

    let cancelled = false;
    const isRefresh = hasData && refreshTick > 0;

    async function run() {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
        setCachedAt(null);
        setCacheTtlSeconds(null);
      }
      try {
        const res = await getCourses(subject, term, false);
        if (cancelled) return;
        setData(res.data || []);
        setIsStale(res.source === "stale" || res.source === "cached_only");
        setCachedAt(res.cached_at ?? null);
        setCacheTtlSeconds(res.cache_ttl_seconds ?? DEFAULT_SEAT_CACHE_TTL_SECONDS);
        if (isRefresh) setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Failed to load courses");
        if (!isRefresh) setData([]);
        if (!isRefresh) setCacheTtlSeconds(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, subject, term, refreshTick]);

  return { data, loading, refreshing, error, isStale, cachedAt, cacheTtlSeconds };
}

