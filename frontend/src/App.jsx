import { useState } from "react";
import CourseSearch from "./pages/CourseSearch.jsx";
import WeeklyPlanner from "./components/WeeklyPlanner.jsx";

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

function getCourseLabel(course) {
  const subject = pickFirst(course, ["subjectCode", "subject", "subj"]);
  const number = pickFirst(course, ["courseNumber", "courseNbr", "courseNum", "catalogNumber"]);
  const section = pickFirst(course, ["section", "classSection", "enrollmentSection"]);
  const code = subject && number ? `${subject} ${number}` : "Course";
  return section ? `${code} Section ${section}` : code;
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

function firstConflict(existingCourses, nextCourse) {
  const nextSlots = listMeetingSlots(nextCourse);
  if (!nextSlots.length) return null;
  for (const existing of existingCourses) {
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

export default function App() {
  const [page, setPage] = useState("search");
  const [activePlannerTerm, setActivePlannerTerm] = useState("fall");
  const [plannerByTerm, setPlannerByTerm] = useState({ fall: [], winter: [] });
  const [plannerMessage, setPlannerMessage] = useState("");

  function addCourseToPlanner(course, termKey) {
    const key = termKey === "winter" ? "winter" : "fall";
    const courseId = course?.courseReferenceNumber || course?.crn;
    if (!courseId) return;

    setPlannerByTerm((prev) => {
      const existing = prev[key] || [];
      if (existing.some((item) => (item.courseReferenceNumber || item.crn) === courseId)) {
        setPlannerMessage(`${getCourseLabel(course)} is already in your ${key} planner.`);
        return prev;
      }

      const conflictCourse = firstConflict(existing, course);
      if (conflictCourse) {
        setPlannerMessage(
          `Conflict blocked: ${getCourseLabel(course)} overlaps with ${getCourseLabel(conflictCourse)} in ${key}.`
        );
        return prev;
      }

      setPlannerMessage("");
      return { ...prev, [key]: [...existing, course] };
    });

    setActivePlannerTerm(key);
  }

  function removeCourseFromPlanner(termKey, courseId) {
    setPlannerByTerm((prev) => ({
      ...prev,
      [termKey]: (prev[termKey] || []).filter(
        (item) => (item.courseReferenceNumber || item.crn) !== courseId
      ),
    }));
    setPlannerMessage("");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-heading text-xl text-slate-900">BISONplan</div>
          <nav className="inline-flex rounded-lg border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setPage("search")}
              className={`px-3 py-1.5 text-sm rounded-md ${
                page === "search" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Course Search
            </button>
            <button
              type="button"
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

      {page === "search" ? (
        <CourseSearch
          onAddToPlanner={addCourseToPlanner}
          plannerMessage={plannerMessage}
          onClearPlannerMessage={() => setPlannerMessage("")}
        />
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <WeeklyPlanner
            activePlannerTerm={activePlannerTerm}
            setActivePlannerTerm={setActivePlannerTerm}
            plannerByTerm={plannerByTerm}
            onRemoveCourse={removeCourseFromPlanner}
          />
        </div>
      )}
    </div>
  );
}

