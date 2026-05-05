import { useEffect, useMemo, useState } from "react";
import { getHealth } from "../api/client.js";
import useCourses from "../hooks/useCourses.js";
import FilterPanel from "../components/FilterPanel.jsx";
import SearchBar from "../components/SearchBar.jsx";
import CourseList from "../components/CourseList.jsx";
import StaleBanner from "../components/StaleBanner.jsx";

function toMinutesAgo(cachedAtSeconds) {
  if (!cachedAtSeconds) return null;
  const nowSeconds = Date.now() / 1000;
  const diffSeconds = nowSeconds - cachedAtSeconds;
  if (!Number.isFinite(diffSeconds) || diffSeconds < 0) return null;
  return Math.max(0, Math.round(diffSeconds / 60));
}

function courseCode(course) {
  const subject = course.subjectCode || course.subject || course.subj || course.subjectDescription;
  const num = course.courseNumber || course.courseNbr || course.courseNum || course.catalogNbr;
  if (subject && num) return `${subject} ${num}`.trim();
  return course.courseCode || "";
}

export default function CourseSearch() {
  const [health, setHealth] = useState({ aurora_status: "up", latency_ms: null });

  const [terms, setTerms] = useState({});
  const [termKey, setTermKey] = useState("");
  const termCode = terms[termKey] || "";

  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState("");

  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [creditHour, setCreditHour] = useState("");
  const [scheduleType, setScheduleType] = useState("any");

  useEffect(() => {
    async function run() {
      // Fetch terms (hardcoded + dynamic) from the backend.
      // Reuse getHealth's axios instance for consistency.
      const res = await fetch("http://localhost:8000/api/terms");
      const json = await res.json();
      if (json?.data) {
        setTerms(json.data);
        const firstKey = Object.keys(json.data)[0] || "";
        setTermKey(firstKey);
      }
    }
    run();
  }, []);

  useEffect(() => {
    if (!termCode) return;
    async function run() {
      const res = await fetch(`http://localhost:8000/api/subjects?term=${encodeURIComponent(termCode)}`);
      const json = await res.json();
      setSubjects(json?.data || []);
      const first = (json?.data || [])[0]?.code || "";
      setSubject(first);
    }
    run();
  }, [termCode]);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await getHealth();
        if (cancelled) return;
        setHealth(res?.data || { aurora_status: "up" });
      } catch {
        // ignore (keep previous)
      }
    }
    poll();
    const id = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const { data: courses, loading, error, isStale, cachedAt } = useCourses(subject, termCode);

  const cachedAtMinutesAgo = useMemo(() => toMinutesAgo(cachedAt), [cachedAt]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const creditNum = creditHour ? Number(creditHour) : null;

    return (courses || [])
      .filter((c) => {
        if (!c) return false;
        if (openOnly) {
          const seats = Number(c.seatsAvailable ?? 0);
          if (seats <= 0) return false;
        }
        if (creditNum != null) {
          const credits = Number(c.credits ?? c.creditHours ?? 0);
          if (credits !== creditNum) return false;
        }
        if (scheduleType !== "any") {
          const hasMeeting =
            Boolean(c.meetingDays) || Boolean(c.meetingTime) || Boolean(c.meetingTimes) || Boolean(c.times);
          if (scheduleType === "days" && !hasMeeting) return false;
          if (scheduleType === "none" && hasMeeting) return false;
        }
        if (q) {
          const hay = `${courseCode(c)} ${c.title || c.courseTitle || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice(0, 2000);
  }, [courses, query, openOnly, creditHour, scheduleType]);

  return (
    <div className="min-h-screen">
      <StaleBanner isStale={isStale} cachedAtMinutesAgo={cachedAtMinutesAgo} />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-heading text-3xl">Course Search</div>
            <div className="text-sm text-slate-600 mt-1">
              Live seats from Aurora, with fallback when Aurora is down.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                health.aurora_status === "up" ? "bg-green-500" : "bg-red-500"
              }`}
              title={`Aurora: ${health.aurora_status}`}
            />
            <div className="text-xs text-slate-600">
              {health.latency_ms != null ? `${health.latency_ms} ms` : ""}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-600">Term</label>
            <select
              value={termKey}
              onChange={(e) => setTermKey(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {Object.entries(terms).map(([k, v]) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, " ")} ({v})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              disabled={!subjects.length}
            >
              {subjects.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <SearchBar value={query} onChange={setQuery} />
          </div>
          <div>
            <FilterPanel
              openOnly={openOnly}
              setOpenOnly={setOpenOnly}
              creditHour={creditHour}
              setCreditHour={setCreditHour}
              scheduleType={scheduleType}
              setScheduleType={setScheduleType}
            />
          </div>
        </div>
              
        <div className="mt-6">
          {loading ? (
            <div className="text-slate-600">Loading courses...</div>
          ) : error ? (
            <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          ) : (
            <CourseList courses={filteredCourses} />
          )}
          {!loading && !error && filteredCourses.length === 0 ? (
            <div className="text-slate-600 mt-4">Try adjusting your filters.</div>
          ) : null}
        </div>
      </div>
      
    </div>
    
  );
}

