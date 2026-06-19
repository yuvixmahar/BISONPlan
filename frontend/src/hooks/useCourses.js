import { useEffect, useMemo, useRef, useState } from "react";
import { getCourses } from "../api/client.js";
import { trackCourseSearched } from "../utils/analytics.js";
import { DEFAULT_SEAT_CACHE_TTL_SECONDS } from "../utils/seatRefresh.js";

// Paint the first courses fast, then pull the rest in the background (in large
// chunks) so the full list is loaded by the time the user starts searching.
const FIRST_PAGE_SIZE = 20;
const REST_PAGE_SIZE = 200;

function courseKey(c) {
  return c?.courseReferenceNumber ?? c?.crn ?? JSON.stringify(c);
}

export default function useCourses(subject, term, refreshTick = 0) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false); // first page (blocks the list)
  const [loadingMore, setLoadingMore] = useState(false); // background rest
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);
  const [cacheTtlSeconds, setCacheTtlSeconds] = useState(null);

  const enabled = useMemo(() => {
    return Boolean(subject && subject.trim() && term && term.trim());
  }, [subject, term]);

  // Avoid re-running the effect when `data` changes; we only need to know
  // whether data exists at the moment a refresh is triggered.
  const hasDataRef = useRef(false);
  hasDataRef.current = data.length > 0;

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      setError(null);
      setCacheTtlSeconds(null);
      return;
    }

    let cancelled = false;
    const isRefresh = hasDataRef.current && refreshTick > 0;

    async function run() {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
        setData([]);
        setCachedAt(null);
        setCacheTtlSeconds(null);
      }

      // 1) First page — render immediately.
      let firstItems = [];
      let total = 0;
      try {
        const first = await getCourses(subject, term, false, 0, FIRST_PAGE_SIZE);
        if (cancelled) return;
        firstItems = first.data || [];
        total = Number(first.total ?? firstItems.length);
        setData(firstItems);
        setIsStale(first.source === "stale" || first.source === "cached_only");
        setCachedAt(first.cached_at ?? null);
        setCacheTtlSeconds(first.cache_ttl_seconds ?? DEFAULT_SEAT_CACHE_TTL_SECONDS);
        // Count a real search (initial load only, not background seat refreshes).
        if (!isRefresh) trackCourseSearched(subject, term);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Failed to load courses");
        if (!isRefresh) {
          setData([]);
          setCacheTtlSeconds(null);
        }
        return;
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }

      // 2) Background — load the rest in large chunks and append.
      if (cancelled || firstItems.length >= total) return;

      setLoadingMore(true);
      try {
        const seen = new Set(firstItems.map(courseKey));
        let acc = firstItems;
        let offset = firstItems.length;
        while (!cancelled && acc.length < total) {
          const page = await getCourses(subject, term, false, offset, REST_PAGE_SIZE);
          if (cancelled) return;
          const items = page.data || [];
          if (!items.length) break;
          const fresh = items.filter((c) => {
            const k = courseKey(c);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          if (fresh.length) {
            acc = acc.concat(fresh);
            setData(acc);
          }
          offset += items.length;
        }
      } catch {
        // Background failure: keep the first page already shown rather than
        // wiping the list. The user can still search what loaded.
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, subject, term, refreshTick]);

  return { data, loading, loadingMore, refreshing, error, isStale, cachedAt, cacheTtlSeconds };
}
