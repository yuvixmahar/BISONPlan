import { useEffect, useMemo, useState } from "react";
import { getCourses } from "../api/client.js";

export default function useCourses(subject, term) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [cachedAt, setCachedAt] = useState(null);

  const enabled = useMemo(() => {
    return Boolean(subject && subject.trim() && term && term.trim());
  }, [subject, term]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      setError(null);
      setIsStale(false);
      setCachedAt(null);
      return;
    }

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await getCourses(subject, term, false);
        if (cancelled) return;
        setData(res.data || []);
        setIsStale(res.source === "stale");
        setCachedAt(res.cached_at ?? null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Failed to load courses");
        setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, subject, term]);

  return { data, loading, error, isStale, cachedAt };
}

