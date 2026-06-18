import { useCallback, useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import CourseSearch from "./pages/CourseSearch.jsx";
import WeeklyPlanner from "./components/WeeklyPlanner.jsx";
import PlannerToast from "./components/PlannerToast.jsx";
import DisclaimerModal from "./components/DisclaimerModal.jsx";
import SiteFooter from "./components/SiteFooter.jsx";
import { getCourseDisplayLabel } from "./utils/course.js";
import {
  findPlannerConflict,
  getCourseIdentity,
  normalizePlannerTerm,
  PLANNER_TERMS,
} from "./utils/planner.js";
import { loadPlannerState, savePlannerState } from "./utils/plannerStorage.js";
import { acceptDisclaimer, hasAcceptedDisclaimer } from "./utils/disclaimer.js";

function getTermLabel(termKey) {
  return PLANNER_TERMS.find((term) => term.key === termKey)?.label || termKey;
}

export default function App() {
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => hasAcceptedDisclaimer());
  const [page, setPage] = useState("search");
  const [plannerInit] = useState(() => loadPlannerState());
  const [activePlannerTerm, setActivePlannerTerm] = useState("fall");
  const [plannerByTerm, setPlannerByTerm] = useState(() => plannerInit.plannerByTerm);
  const [plannerNotice, setPlannerNotice] = useState(null);
  const [plannerIdSeed, setPlannerIdSeed] = useState(() => plannerInit.plannerIdSeed);

  useEffect(() => {
    savePlannerState(plannerByTerm, plannerIdSeed);
  }, [plannerByTerm, plannerIdSeed]);

  const handleAcceptDisclaimer = useCallback(() => {
    acceptDisclaimer();
    setDisclaimerAccepted(true);
  }, []);

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

  if (!disclaimerAccepted) {
    return (
      <>
        <DisclaimerModal onAccept={handleAcceptDisclaimer} />
        <Analytics />
        <SpeedInsights />
      </>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-bison-cream">
      <header className="sticky top-0 z-50 border-b border-bison-brown-dark bg-bison-brown shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-heading text-3xl text-bison-gold tracking-tight">BISONplan</div>
          <nav className="inline-flex rounded-lg border border-white/20 bg-white/5 p-1">
            <button
              type="button"
              aria-current={page === "search" ? "page" : undefined}
              onClick={() => setPage("search")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                page === "search"
                  ? "bg-bison-gold text-bison-brown font-semibold"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              Course Search
            </button>
            <button
              type="button"
              aria-current={page === "planner" ? "page" : undefined}
              onClick={() => setPage("planner")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                page === "planner"
                  ? "bg-bison-gold text-bison-brown font-semibold"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              Weekly Planner
            </button>
          </nav>
        </div>
      </header>

      <main>
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
      </main>

      <SiteFooter />
      <PlannerToast notice={plannerNotice} onDismiss={dismissPlannerNotice} />
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
