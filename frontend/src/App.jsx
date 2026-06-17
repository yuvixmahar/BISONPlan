import { useCallback, useEffect, useState } from "react";
import CourseSearch from "./pages/CourseSearch.jsx";
import WeeklyPlanner from "./components/WeeklyPlanner.jsx";
import PlannerToast from "./components/PlannerToast.jsx";
import { getCourseDisplayLabel } from "./utils/course.js";
import {
  findPlannerConflict,
  getCourseIdentity,
  normalizePlannerTerm,
  PLANNER_TERMS,
} from "./utils/planner.js";
import { loadPlannerState, savePlannerState } from "./utils/plannerStorage.js";

function getTermLabel(termKey) {
  return PLANNER_TERMS.find((term) => term.key === termKey)?.label || termKey;
}

export default function App() {
  const [page, setPage] = useState("search");
  const [plannerInit] = useState(() => loadPlannerState());
  const [activePlannerTerm, setActivePlannerTerm] = useState("fall");
  const [plannerByTerm, setPlannerByTerm] = useState(() => plannerInit.plannerByTerm);
  const [plannerNotice, setPlannerNotice] = useState(null);
  const [plannerIdSeed, setPlannerIdSeed] = useState(() => plannerInit.plannerIdSeed);

  useEffect(() => {
    savePlannerState(plannerByTerm, plannerIdSeed);
  }, [plannerByTerm, plannerIdSeed]);

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

      const conflictCourse = findPlannerConflict(existing, course, key);
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
