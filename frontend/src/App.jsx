import { useCallback, useState } from "react";
import CourseSearch from "./pages/CourseSearch.jsx";
import WeeklyPlanner from "./components/WeeklyPlanner.jsx";
import PlannerToast from "./components/PlannerToast.jsx";
import { getCourseDisplayLabel } from "./utils/course.js";
import {
  dateRangesOverlap,
  getCourseDateRange,
  normalizePlannerTerm,
  PLANNER_TERMS,
} from "./utils/planner.js";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function pickFirst(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

function toMinutes(hhmm) {
  const raw = String(hhmm || "").padStart(4, "0");
  if (!/^\d{4}$/.test(raw)) return null;
  const hh = Number(raw.slice(0, 2));
  const mm = Number(raw.slice(2));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function getCourseIdentity(course) {
  const crn = pickFirst(course, ["courseReferenceNumber", "crn"]);
  if (crn) return `crn:${crn}`;
  const subject = pickFirst(course, ["subjectCode", "subject", "subj", "courseCode"], "course");
  const number = pickFirst(course, ["courseNumber", "courseNbr", "courseNum", "catalogNumber"], "");
  const section = pickFirst(course, ["section", "classSection", "enrollmentSection", "sequenceNumber"], "");
  return `${subject}-${number}-${section}`;
}

function listMeetingSlots(course) {
  const slots = [];
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  for (const item of mf) {
    const mt = item?.meetingTime;
    if (!mt) continue;
    const start = toMinutes(mt.beginTime);
    const end = toMinutes(mt.endTime);
    if (start == null || end == null || end <= start) continue;
    for (const day of DAYS) {
      if (mt?.[day]) slots.push({ day, start, end });
    }
  }
  return slots;
}

function firstConflict(existingCourses, nextCourse, termKey) {
  const nextSlots = listMeetingSlots(nextCourse);
  if (!nextSlots.length) return null;
  const nextDateRange = getCourseDateRange(nextCourse);

  for (const existing of existingCourses) {
    if (
      termKey === "summer" &&
      !dateRangesOverlap(getCourseDateRange(existing), nextDateRange)
    ) {
      continue;
    }

    const existingSlots = listMeetingSlots(existing);
    for (const a of nextSlots) {
      for (const b of existingSlots) {
        if (a.day !== b.day) continue;
        const overlaps = a.start < b.end && b.start < a.end;
        if (overlaps) return existing;
      }
    }
  }
  return null;
}

function getTermLabel(termKey) {
  return PLANNER_TERMS.find((term) => term.key === termKey)?.label || termKey;
}

export default function App() {
  const [page, setPage] = useState("search");
  const [activePlannerTerm, setActivePlannerTerm] = useState("fall");
  const [plannerByTerm, setPlannerByTerm] = useState({ fall: [], winter: [], summer: [] });
  const [plannerNotice, setPlannerNotice] = useState(null);
  const [plannerIdSeed, setPlannerIdSeed] = useState(1);

  function addCourseToPlanner(course, termKey) {
    const key = normalizePlannerTerm(termKey);
    const courseIdentity = getCourseIdentity(course);
    if (!courseIdentity) return;
    const nextPlannerId = `${key}-${plannerIdSeed}-${Date.now()}`;
    setPlannerIdSeed((prev) => prev + 1);

    setPlannerByTerm((prev) => {
      const existing = prev[key] || [];
      if (existing.some((item) => getCourseIdentity(item) === courseIdentity)) {
        setPlannerNotice({
          id: Date.now(),
          tone: "warning",
          message: `${getCourseDisplayLabel(course)} is already in your ${getTermLabel(key)} planner.`,
        });
        return prev;
      }

      const conflictCourse = firstConflict(existing, course, key);
      if (conflictCourse) {
        setPlannerNotice({
          id: Date.now(),
          tone: "error",
          message: `Conflict blocked: ${getCourseDisplayLabel(course)} overlaps with ${getCourseDisplayLabel(conflictCourse)} in ${getTermLabel(key)}.`,
        });
        return prev;
      }

      const plannerCourse = { ...course, _plannerId: nextPlannerId };
      setPlannerNotice({
        id: Date.now(),
        tone: "success",
        message: `${getCourseDisplayLabel(course)} added to ${getTermLabel(key)} planner.`,
      });
      setActivePlannerTerm(key);
      return { ...prev, [key]: [...existing, plannerCourse] };
    });
  }

  const dismissPlannerNotice = useCallback(() => setPlannerNotice(null), []);

  function removeCourseFromPlanner(termKey, plannerCourseId) {
    setPlannerByTerm((prev) => ({
      ...prev,
      [termKey]: (prev[termKey] || []).filter(
        (item) => item?._plannerId !== plannerCourseId
      ),
    }));
    setPlannerNotice(null);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-heading text-xl text-slate-900">BISONplan</div>
          <nav className="inline-flex rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              aria-current={page === "search" ? "page" : undefined}
              onClick={() => setPage("search")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                page === "search" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Course Search
            </button>
            <button
              type="button"
              aria-current={page === "planner" ? "page" : undefined}
              onClick={() => setPage("planner")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                page === "planner" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Weekly Planner
            </button>
          </nav>
        </div>
      </header>

      <div hidden={page !== "search"}>
        <CourseSearch
          isActive={page === "search"}
          onAddToPlanner={addCourseToPlanner}
        />
      </div>
      <div hidden={page !== "planner"} className="max-w-6xl mx-auto px-4 py-6">
        <WeeklyPlanner
          activePlannerTerm={activePlannerTerm}
          setActivePlannerTerm={setActivePlannerTerm}
          plannerByTerm={plannerByTerm}
          onRemoveCourse={removeCourseFromPlanner}
        />
      </div>
      <PlannerToast notice={plannerNotice} onDismiss={dismissPlannerNotice} />
    </div>
  );
}

