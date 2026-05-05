import { useEffect, useMemo, useRef, useState } from "react";
import { getHealth, getSubjects, getTerms } from "../api/client.js";
import useCourses from "../hooks/useCourses.js";
import FilterPanel from "../components/FilterPanel.jsx";
import SearchBar from "../components/SearchBar.jsx";
import CourseList from "../components/CourseList.jsx";
import StaleBanner from "../components/StaleBanner.jsx";
import QuickViewDrawer from "../components/QuickViewDrawer.jsx";

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

  const [terms, setTerms] = useState([]);
  const [termCode, setTermCode] = useState("");
  const [termsOffset, setTermsOffset] = useState(1);
  const [termsHasMore, setTermsHasMore] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termMenuOpen, setTermMenuOpen] = useState(false);
  const termMenuRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [subject, setSubject] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectOffset, setSubjectOffset] = useState(1);
  const [subjectHasMore, setSubjectHasMore] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [subjectSessionId, setSubjectSessionId] = useState("");
  const [subjectActiveIndex, setSubjectActiveIndex] = useState(-1);
  const subjectMenuRef = useRef(null);
  const subjectListRef = useRef(null);

  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(true);
  const [creditHour, setCreditHour] = useState("");
  const [scheduleType, setScheduleType] = useState("any");
  const [quickViewCourse, setQuickViewCourse] = useState(null);

  useEffect(() => {
    async function runInitialTerms() {
      setTermsLoading(true);
      try {
        const json = await getTerms(1, 10, "");
        const pageItems = json?.data?.items || [];
        setTerms(pageItems);
        setTermsHasMore(Boolean(json?.data?.has_more));
        setTermsOffset(json?.data?.next_offset || 2);
        if (pageItems.length > 0) {
          setTermCode(pageItems[0].code);
        }
      } finally {
        setTermsLoading(false);
      }
    }
    runInitialTerms();
  }, []);

  useEffect(() => {
    if (!termCode) return;
    async function runInitialSubjects() {
      setSubjectLoading(true);
      const nextSession = `bp-${termCode}-${Date.now()}`;
      setSubjectSessionId(nextSession);
      try {
        const json = await getSubjects(termCode, "", 1, 10, nextSession);
        const items = json?.data?.items || [];
        setSubjects(items);
        setSubjectHasMore(Boolean(json?.data?.has_more));
        setSubjectOffset(json?.data?.next_offset || 2);
        const first = items[0]?.code || "";
        setSubject(first);
        const firstLabel = items[0]
          ? `${items[0].code} - ${items[0].description}`
          : "";
        setSubjectInput(firstLabel);
      } finally {
        setSubjectLoading(false);
      }
    }
    runInitialSubjects();
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

  async function loadMoreTerms() {
    if (termsLoading || !termsHasMore) return;
    setTermsLoading(true);
    try {
      const json = await getTerms(termsOffset, 10, "");
      const pageItems = json?.data?.items || [];
      setTerms((prev) => {
        const seen = new Set(prev.map((t) => t.code));
        const merged = [...prev];
        for (const item of pageItems) {
          if (!seen.has(item.code)) {
            seen.add(item.code);
            merged.push(item);
          }
        }
        return merged;
      });
      setTermsHasMore(Boolean(json?.data?.has_more));
      setTermsOffset(json?.data?.next_offset || termsOffset + 1);
    } finally {
      setTermsLoading(false);
    }
  }

  useEffect(() => {
    function onDocClick(e) {
      if (!termMenuRef.current) return;
      if (!termMenuRef.current.contains(e.target)) {
        setTermMenuOpen(false);
      }
      if (subjectMenuRef.current && !subjectMenuRef.current.contains(e.target)) {
        setSubjectMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onTermListScroll(e) {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (nearBottom) {
      loadMoreTerms();
    }
  }

  async function fetchSubjectPage(searchText, offset, append) {
    if (!termCode) return;
    setSubjectLoading(true);
    try {
      const json = await getSubjects(
        termCode,
        searchText,
        offset,
        10,
        subjectSessionId || `bp-${termCode}-${Date.now()}`
      );
      const items = json?.data?.items || [];
      setSubjects((prev) => {
        if (!append) return items;
        const seen = new Set(prev.map((s) => s.code));
        const merged = [...prev];
        for (const item of items) {
          if (!seen.has(item.code)) {
            seen.add(item.code);
            merged.push(item);
          }
        }
        return merged;
      });
      setSubjectHasMore(Boolean(json?.data?.has_more));
      setSubjectOffset(json?.data?.next_offset || offset + 1);
      setSubjectActiveIndex(items.length ? 0 : -1);
    } finally {
      setSubjectLoading(false);
    }
  }

  function onSubjectInputChange(e) {
    const value = e.target.value;
    setSubjectInput(value);
    setSubjectMenuOpen(true);
    setSubjectOffset(1);
    setSubjectActiveIndex(-1);
  }

  useEffect(() => {
    if (!termCode || !subjectMenuOpen) return;
    const t = setTimeout(() => {
      fetchSubjectPage(subjectInput.trim(), 1, false);
    }, 250);
    return () => clearTimeout(t);
  }, [subjectInput, termCode, subjectMenuOpen]);

  function onSubjectListScroll(e) {
    const el = e.currentTarget;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
    if (nearBottom && !subjectLoading && subjectHasMore) {
      fetchSubjectPage(subjectInput.trim(), subjectOffset, true);
    }
  }

  function selectSubjectOption(option) {
    setSubject(option.code);
    setSubjectInput(`${option.code} - ${option.description}`);
    setSubjectMenuOpen(false);
  }

  function onSubjectInputKeyDown(e) {
    if (!subjectMenuOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setSubjectMenuOpen(true);
      return;
    }

    if (!subjectMenuOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSubjectActiveIndex((prev) => {
        const next = Math.min(prev + 1, subjects.length - 1);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSubjectActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (subjectActiveIndex >= 0 && subjectActiveIndex < subjects.length) {
        e.preventDefault();
        selectSubjectOption(subjects[subjectActiveIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setSubjectMenuOpen(false);
    }
  }

  useEffect(() => {
    if (!subjectMenuOpen || subjectActiveIndex < 0 || !subjectListRef.current) return;
    const container = subjectListRef.current;
    const node = container.querySelector(`[data-subject-index="${subjectActiveIndex}"]`);
    if (node) {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [subjectActiveIndex, subjectMenuOpen]);

  const cachedAtMinutesAgo = useMemo(() => toMinutesAgo(cachedAt), [cachedAt]);
  const selectedTermLabel = useMemo(() => {
    return terms.find((t) => t.code === termCode)?.description || "Select a term";
  }, [terms, termCode]);

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
          <div className="relative" ref={termMenuRef}>
            <label className="text-xs text-slate-600">Term</label>
            <button
              type="button"
              onClick={() => setTermMenuOpen((v) => !v)}
              className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 text-left flex items-center justify-between gap-2"
            >
              <span className="truncate">{selectedTermLabel}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  termMenuOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {termMenuOpen ? (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
                <div
                  className="max-h-64 overflow-y-auto py-1"
                  onScroll={onTermListScroll}
                >
                  {terms.map((t) => (
                    <button
                      key={t.code}
                      type="button"
                      onClick={() => {
                        setTermCode(t.code);
                        setTermMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                        t.code === termCode ? "bg-slate-100" : ""
                      }`}
                    >
                      {t.description}
                    </button>
                  ))}
                  {termsLoading ? (
                    <div className="px-3 py-2 text-xs text-slate-500">Loading more terms...</div>
                  ) : null}
                  {!termsHasMore ? (
                    <div className="px-3 py-2 text-xs text-slate-400">No more terms</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Subject</label>
            <div className="relative" ref={subjectMenuRef}>
              <input
                value={subjectInput}
                onChange={onSubjectInputChange}
                onFocus={() => setSubjectMenuOpen(true)}
                onKeyDown={onSubjectInputKeyDown}
                placeholder="Type subject code or name..."
                className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              {subjectMenuOpen ? (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
                  <div
                    ref={subjectListRef}
                    className="max-h-64 overflow-y-auto py-1"
                    onScroll={onSubjectListScroll}
                  >
                    {subjects.map((s, idx) => (
                      <button
                        key={s.code}
                        data-subject-index={idx}
                        type="button"
                        onMouseEnter={() => setSubjectActiveIndex(idx)}
                        onClick={() => selectSubjectOption(s)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                          idx === subjectActiveIndex || s.code === subject
                            ? "bg-slate-100"
                            : ""
                        }`}
                      >
                        {s.code} - {s.description}
                      </button>
                    ))}
                    {subjectLoading ? (
                      <div className="px-3 py-2 text-xs text-slate-500">Loading subjects...</div>
                    ) : null}
                    {!subjectLoading && subjects.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">No matches</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
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
            <CourseList
              courses={filteredCourses}
              termCode={termCode}
              onQuickView={setQuickViewCourse}
            />
          )}
          {!loading && !error && filteredCourses.length === 0 ? (
            <div className="text-slate-600 mt-4">Try adjusting your filters.</div>
          ) : null}
        </div>
      </div>

      <QuickViewDrawer
        open={Boolean(quickViewCourse)}
        course={quickViewCourse}
        termCode={termCode}
        onClose={() => setQuickViewCourse(null)}
      />

    </div>
    
  );
}

