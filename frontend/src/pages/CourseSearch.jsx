import { useEffect, useMemo, useRef, useState } from "react";
import { getInstructorName } from "../utils/course.js";
import { getSubjects, getTerms } from "../api/client.js";
import useCourses from "../hooks/useCourses.js";
import FilterPanel from "../components/FilterPanel.jsx";
import SearchBar from "../components/SearchBar.jsx";
import CourseList from "../components/CourseList.jsx";
import StaleBanner from "../components/StaleBanner.jsx";
import QuickViewDrawer from "../components/QuickViewDrawer.jsx";
import { plannerTermFromTermDescription } from "../utils/planner.js";

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

function getMeetingTimes(course) {
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  return mf.map((m) => m?.meetingTime).filter(Boolean);
}

function hasDay(course, dayCode) {
  if (!dayCode || dayCode === "any") return true;
  const dayMap = {
    M: "monday",
    T: "tuesday",
    W: "wednesday",
    R: "thursday",
    F: "friday",
    S: "saturday",
    U: "sunday",
  };
  const key = dayMap[dayCode];
  if (!key) return true;
  return getMeetingTimes(course).some((mt) => Boolean(mt?.[key]));
}

function inTimeWindow(course, timeFilter) {
  if (!timeFilter || timeFilter === "any") return true;
  const beginTimes = getMeetingTimes(course)
    .map((mt) => Number(mt?.beginTime ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!beginTimes.length) return false;

  return beginTimes.some((t) => {
    if (timeFilter === "morning") return t < 1200;
    if (timeFilter === "afternoon") return t >= 1200 && t < 1700;
    if (timeFilter === "evening") return t >= 1700;
    return true;
  });
}

export default function CourseSearch({
  isActive = true,
  onAddToPlanner,
  plannerMessage,
  onClearPlannerMessage,
}) {
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
  const [includeFullClasses, setIncludeFullClasses] = useState(true);
  const [onlyWaitlisted, setOnlyWaitlisted] = useState(false);
  const [creditHour, setCreditHour] = useState("");
  const [scheduleType, setScheduleType] = useState("any");
  const [campus, setCampus] = useState("any");
  const [deliveryMode, setDeliveryMode] = useState("any");
  const [dayFilter, setDayFilter] = useState("any");
  const [timeFilter, setTimeFilter] = useState("any");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [quickViewCourse, setQuickViewCourse] = useState(null);

  useEffect(() => {
    if (isActive) return;
    setTermMenuOpen(false);
    setSubjectMenuOpen(false);
    setQuickViewCourse(null);
  }, [isActive]);

  useEffect(() => {
    async function runInitialTerms() {
      setTermsLoading(true);
      try {
        const json = await getTerms(1, 10, "");
        const pageItems = json?.data?.items || [];
        setTerms(pageItems);
        setTermsHasMore(Boolean(json?.data?.has_more));
        setTermsOffset(json?.data?.next_offset || 2);
      } finally {
        setTermsLoading(false);
      }
    }
    runInitialTerms();
  }, []);

  useEffect(() => {
    if (!termCode) {
      setSubjects([]);
      setSubject("");
      setSubjectInput("");
      setSubjectMenuOpen(false);
      setSubjectOffset(1);
      setSubjectHasMore(false);
      return;
    }
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
        // Do not auto-select a department on refresh/term change.
        setSubject("");
        setSubjectInput("");
      } finally {
        setSubjectLoading(false);
      }
    }
    runInitialSubjects();
  }, [termCode]);

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
  const hasCourseSelection = Boolean(termCode && subject);
  const campusOptions = useMemo(() => {
    const set = new Set(
      (courses || []).map((c) => c.campusDescription).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [courses]);
  const deliveryOptions = useMemo(() => {
    const set = new Set(
      (courses || [])
        .map(
          (c) =>
            c.instructionalMethodDescription ||
            c.scheduleTypeDescription ||
            c.instructionalMethod
        )
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    const creditNum = creditHour ? Number(creditHour) : null;
    const instructorQ = instructorFilter.trim().toLowerCase();

    return (courses || [])
      .filter((c) => {
        if (!c) return false;
        if (!includeFullClasses) {
          const seats = Number(c.seatsAvailable ?? 0);
          if (seats <= 0) return false;
        }
        if (onlyWaitlisted) {
          const wait = Number(c.waitCount ?? c.waitlistCount ?? 0);
          if (wait <= 0) return false;
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
        if (campus !== "any") {
          if ((c.campusDescription || "") !== campus) return false;
        }
        if (deliveryMode !== "any") {
          const mode =
            c.instructionalMethodDescription ||
            c.scheduleTypeDescription ||
            c.instructionalMethod ||
            "";
          if (mode !== deliveryMode) return false;
        }
        if (!hasDay(c, dayFilter)) return false;
        if (!inTimeWindow(c, timeFilter)) return false;
        if (instructorQ) {
          const instructor = getInstructorName(c).toLowerCase();
          if (!instructor.includes(instructorQ)) return false;
        }
        if (q) {
          const hay = `${courseCode(c)} ${c.title || c.courseTitle || ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice(0, 2000);
  }, [
    courses,
    query,
    includeFullClasses,
    onlyWaitlisted,
    creditHour,
    scheduleType,
    campus,
    deliveryMode,
    dayFilter,
    timeFilter,
    instructorFilter,
  ]);

  function clearFilters() {
    setIncludeFullClasses(true);
    setOnlyWaitlisted(false);
    setCreditHour("");
    setScheduleType("any");
    setCampus("any");
    setDeliveryMode("any");
    setDayFilter("any");
    setTimeFilter("any");
    setInstructorFilter("");
  }

  function plannerTermFromSelection() {
    const selected = terms.find((t) => t.code === termCode)?.description || "";
    return plannerTermFromTermDescription(selected);
  }

  function addCourseToPlanner(course) {
    const targetTerm = plannerTermFromSelection();
    onAddToPlanner?.(course, targetTerm);
  }

  return (
    <div className="min-h-screen">
      <StaleBanner isStale={isStale} cachedAtMinutesAgo={cachedAtMinutesAgo} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div>
          <div>
            <div className="font-heading text-3xl">Course Search</div>
            <div className="text-sm text-slate-600 mt-1">
              Live seats from Aurora, with fallback when Aurora is down.
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

        <div className="mt-5 space-y-3">
          <SearchBar value={query} onChange={setQuery} />
          <FilterPanel
            includeFullClasses={includeFullClasses}
            setIncludeFullClasses={setIncludeFullClasses}
            onlyWaitlisted={onlyWaitlisted}
            setOnlyWaitlisted={setOnlyWaitlisted}
            creditHour={creditHour}
            setCreditHour={setCreditHour}
            scheduleType={scheduleType}
            setScheduleType={setScheduleType}
            campus={campus}
            setCampus={setCampus}
            campusOptions={campusOptions}
            deliveryMode={deliveryMode}
            setDeliveryMode={setDeliveryMode}
            deliveryOptions={deliveryOptions}
            dayFilter={dayFilter}
            setDayFilter={setDayFilter}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            instructorFilter={instructorFilter}
            setInstructorFilter={setInstructorFilter}
            onClearFilters={clearFilters}
          />
        </div>
              
        <div className="mt-6">
          {plannerMessage ? (
            <div className="mb-3 text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start justify-between gap-3">
              <span>{plannerMessage}</span>
              <button
                type="button"
                onClick={onClearPlannerMessage}
                className="text-xs px-2 py-1 rounded border border-amber-300 hover:bg-amber-100"
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {!termCode ? (
            <div className="text-slate-600 bg-white border border-slate-200 rounded-lg p-4">
              Select a term to begin.
            </div>
          ) : !subject ? (
            <div className="text-slate-600 bg-white border border-slate-200 rounded-lg p-4">
              Select a department to load courses.
            </div>
          ) : loading ? (
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
              onAddToPlanner={addCourseToPlanner}
            />
          )}
          {hasCourseSelection && !loading && !error && filteredCourses.length === 0 ? (
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

