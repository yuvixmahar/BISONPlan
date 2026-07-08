import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCourses } from "../api/client.js";
import { getCourseCrn } from "../utils/course.js";
import {
  computePlannerResults,
  getCourseSubjectCode,
  getCourseTermCode,
  issuesSignature,
} from "../utils/plannerFreshness.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes while the tab is active
const RETURN_THROTTLE_MS = 60 * 1000; // don't re-check on every focus flicker

function flattenPlanned(plannerByTerm) {
  const out = [];
  for (const termKey of Object.keys(plannerByTerm || {})) {
    for (const course of plannerByTerm[termKey] || []) {
      if (course?._plannerId) out.push({ termKey, course });
    }
  }
  return out;
}

// One backend request per distinct subject+term, matched by CRN. A per-group
// failure (Aurora down) is isolated so those courses become "unverifiable"
// rather than falsely flagged as removed.
async function fetchFreshBySubjectTerm(planned) {
  const groups = new Map();
  for (const { course } of planned) {
    const subject = getCourseSubjectCode(course);
    const term = getCourseTermCode(course);
    if (subject && term) groups.set(`${subject}|${term}`, { subject, term });
  }

  const result = new Map();
  await Promise.all(
    [...groups.entries()].map(async ([key, { subject, term }]) => {
      try {
        const res = await getCourses(subject, term, false);
        const byCrn = new Map();
        for (const c of res?.data || []) {
          const crn = getCourseCrn(c);
          if (crn) byCrn.set(String(crn), c);
        }
        result.set(key, { byCrn, ok: true });
      } catch {
        result.set(key, { byCrn: new Map(), ok: false });
      }
    })
  );
  return result;
}

export default function usePlannerFreshness(plannerByTerm) {
  const [results, setResults] = useState({});
  const [checking, setChecking] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState("");

  const planned = useMemo(() => flattenPlanned(plannerByTerm), [plannerByTerm]);
  const plannedRef = useRef(planned);
  plannedRef.current = planned;
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const lastCheckedRef = useRef(0);
  const runningRef = useRef(false);

  const verify = useCallback(async () => {
    const current = plannedRef.current;
    if (!current.length) {
      setResults({});
      return {};
    }
    if (runningRef.current) return resultsRef.current;

    runningRef.current = true;
    setChecking(true);
    try {
      const fresh = await fetchFreshBySubjectTerm(current);
      const next = computePlannerResults(current, fresh);
      setResults(next);
      lastCheckedRef.current = Date.now();
      return next;
    } finally {
      runningRef.current = false;
      setChecking(false);
    }
  }, []);

  // Initial check, 10-min interval while visible, and re-check on return.
  useEffect(() => {
    let intervalId = null;
    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };
    const start = () => {
      stop();
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") verify();
      }, CHECK_INTERVAL_MS);
    };

    function onReturn() {
      if (document.visibilityState !== "visible") {
        stop();
        return;
      }
      if (Date.now() - lastCheckedRef.current > RETURN_THROTTLE_MS) {
        // Returning users get re-alerted even about a change they dismissed.
        setDismissedSignature("");
        verify();
      }
      start();
    }

    if (document.visibilityState === "visible") {
      verify();
      start();
    }
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [verify]);

  const plannedIds = useMemo(
    () => new Set(planned.map(({ course }) => course._plannerId)),
    [planned]
  );

  // Only surface issues for courses still in the planner.
  const issues = useMemo(
    () =>
      Object.entries(results)
        .filter(([id, r]) => plannedIds.has(id) && r.status === "changed")
        .map(([id, r]) => ({ id, ...r })),
    [results, plannedIds]
  );

  const signature = useMemo(() => issuesSignature(issues), [issues]);
  const showNotice = issues.length > 0 && signature !== dismissedSignature;

  const dismiss = useCallback(() => setDismissedSignature(signature), [signature]);

  // Force the notice back into view (e.g. when the download gate finds issues
  // the user had previously dismissed).
  const remind = useCallback(() => setDismissedSignature(""), []);

  // Drop a single course's issue immediately after the user acts on it.
  const resolve = useCallback((plannerId) => {
    setResults((prev) => {
      if (!prev[plannerId]) return prev;
      return { ...prev, [plannerId]: { ...prev[plannerId], status: "ok", changes: [] } };
    });
  }, []);

  // Used by the download gate: verify now, return this term's issues.
  const verifyTermIssues = useCallback(
    async (termKey) => {
      const res = (await verify()) || resultsRef.current;
      const ids = new Set(
        plannedRef.current
          .filter((p) => p.termKey === termKey)
          .map((p) => p.course._plannerId)
      );
      return Object.entries(res)
        .filter(([id, r]) => ids.has(id) && r.status === "changed")
        .map(([id, r]) => ({ id, ...r }));
    },
    [verify]
  );

  return { issues, showNotice, checking, dismiss, remind, resolve, verify, verifyTermIssues };
}
