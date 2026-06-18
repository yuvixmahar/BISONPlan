import { useEffect, useMemo, useState } from "react";
import { getCourses } from "../api/client.js";
import { DEFAULT_SEAT_CACHE_TTL_SECONDS } from "../utils/seatRefresh.js";
export default function useCourses(subject, term) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState(null);
  const [budgetMessage, setBudgetMessage] = useState(null);

  const enabled = useMemo(() => {
    return Boolean(subject && subject.trim() && term && term.trim());
  }, [subject, term]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError(null);
      setBudgetMessage(null);
      setCacheTtlSeconds(null);
      return;
    }

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      setBudgetMessage(null);
      setCachedAt(null);
      setCacheTtlSeconds(null);
      try {
        const res = await getCourses(subject, term, false);
        if (cancelled) return;
        setData(res.data || []);
        setIsStale(res.source === "stale" || res.source === "cached_only");
        setCachedAt(res.cached_at ?? null);
        setCacheTtlSeconds(res.cache_ttl_seconds ?? DEFAULT_SEAT_CACHE_TTL_SECONDS);
        setBudgetMessage(res.budget_message || null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Failed to load courses");
        setData([]);
        setBudgetMessage(null);
        setCacheTtlSeconds(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, subject, term]);

  return { data, loading, error, isStale, cachedAt, cacheTtlSeconds, budgetMessage };
}

