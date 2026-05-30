import { useMemo } from "react";
import { getInstructorName } from "../utils/course.js";

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"],
];

const START_MINUTES = 8 * 60;
const END_MINUTES = 22 * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;
const GRID_HEIGHT_PX = 1180;

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

function toTimeLabel(totalMinutes) {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  const suffix = hh >= 12 ? "PM" : "AM";
  const normalized = hh % 12 === 0 ? 12 : hh % 12;
  return `${normalized}:${String(mm).padStart(2, "0")} ${suffix}`;
}

function courseCode(course) {
  const subject = pickFirst(course, ["subjectCode", "subject", "subj"]);
  const number = pickFirst(course, ["courseNumber", "courseNbr", "courseNum", "catalogNumber"]);
  if (subject && number) return `${subject} ${number}`;
  return pickFirst(course, ["courseCode", "subjectDescription"], "Course");
}

function getSection(course) {
  return pickFirst(
    course,
    ["section", "classSection", "enrollmentSection", "sequenceNumber"],
    ""
  );
}

function getInstructor(course) {
  return getInstructorName(course);
}

function getMeetings(course) {
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  return mf.map((m) => m?.meetingTime || null).filter(Boolean);
}

function normalizeEvents(courses) {
  const out = [];
  for (const course of courses) {
    const plannerId = course?._plannerId || "";
    const code = courseCode(course);
    const section = getSection(course);
    const instructor = getInstructor(course);
    const title = pickFirst(course, ["title", "courseTitle", "subjectTitle"], "");
    const meetings = getMeetings(course);
    for (let idx = 0; idx < meetings.length; idx += 1) {
      const mt = meetings[idx];
      const start = toMinutes(mt.beginTime);
      const end = toMinutes(mt.endTime);
      if (start == null || end == null || end <= start) continue;
      const locationParts = [
        mt.buildingDescription || mt.building || "",
        mt.room ? `Room ${mt.room}` : "",
      ].filter(Boolean);
      const location = locationParts.join(" - ") || "Location TBA";
      const sectionType = mt.meetingTypeDescription || mt.meetingType || "Class";
      for (const [dayKey, dayLabel] of DAYS) {
        if (!mt?.[dayKey]) continue;
        out.push({
          id: `${plannerId}-${idx}-${dayKey}-${start}-${end}`,
          dayKey,
          dayLabel,
          start,
          end,
          code,
          section,
          instructor,
          title,
          sectionType,
          location,
        });
      }
    }
  }
  return out;
}

export default function WeeklyPlanner({
  activePlannerTerm,
  setActivePlannerTerm,
  plannerByTerm,
  onRemoveCourse,
}) {
  const plannedCourses = plannerByTerm[activePlannerTerm] || [];
  const events = useMemo(() => normalizeEvents(plannedCourses), [plannedCourses]);
  const byDay = useMemo(() => {
    const map = Object.fromEntries(DAYS.map(([k]) => [k, []]));
    for (const ev of events) {
      map[ev.dayKey].push(ev);
    }
    for (const [key] of DAYS) {
      map[key].sort((a, b) => a.start - b.start);
    }
    return map;
  }, [events]);
  const hours = useMemo(() => {
    const result = [];
    for (let t = START_MINUTES; t <= END_MINUTES; t += 60) result.push(t);
    return result;
  }, []);

  return (
    <section className="mt-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-2xl text-slate-900">Week at a Glance</h2>
          <p className="text-sm text-slate-600 mt-1">
            Visualize class times and locations across Fall and Winter terms.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {["fall", "winter"].map((termKey) => (
            <button
              key={termKey}
              type="button"
              onClick={() => setActivePlannerTerm(termKey)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                activePlannerTerm === termKey
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {termKey === "fall" ? "Fall" : "Winter"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        {plannedCourses.length === 0 ? (
          <div className="text-sm text-slate-600">
            No courses added yet for {activePlannerTerm}. Use “Add to Planner” from search results.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {plannedCourses.map((course) => {
                const code = courseCode(course);
                const section = getSection(course);
                const instructor = getInstructor(course);
                const id = course?._plannerId || `${code}-${section}`;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                  >
                    {code}
                    {section ? ` · ${section}` : ""}
                    {instructor ? ` · ${instructor}` : ""}
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-800"
                      onClick={() => onRemoveCourse(activePlannerTerm, id)}
                      aria-label={`Remove ${code} from planner`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[860px] grid grid-cols-[70px_repeat(7,minmax(110px,1fr))] gap-2">
                <div />
                {DAYS.map(([, label]) => (
                  <div key={label} className="text-xs font-semibold text-slate-600 px-2 py-1">
                    {label}
                  </div>
                ))}

                <div className="relative" style={{ height: `${GRID_HEIGHT_PX}px` }}>
                  {hours.map((minute) => (
                    <div
                      key={minute}
                      className="absolute text-[10px] text-slate-500 -translate-y-1/2"
                      style={{ top: `${((minute - START_MINUTES) / TOTAL_MINUTES) * 100}%` }}
                    >
                      {toTimeLabel(minute)}
                    </div>
                  ))}
                </div>

                {DAYS.map(([dayKey, dayLabel]) => (
                  <div
                    key={dayKey}
                    className="relative rounded-lg border border-slate-200 bg-slate-50/40"
                    style={{ height: `${GRID_HEIGHT_PX}px` }}
                  >
                    {hours.map((minute) => (
                      <div
                        key={`${dayKey}-${minute}`}
                        className="absolute left-0 right-0 border-t border-slate-200/80"
                        style={{ top: `${((minute - START_MINUTES) / TOTAL_MINUTES) * 100}%` }}
                      />
                    ))}
                    {(byDay[dayKey] || []).map((ev) => {
                      const topPct = ((ev.start - START_MINUTES) / TOTAL_MINUTES) * 100;
                      const heightPct = ((ev.end - ev.start) / TOTAL_MINUTES) * 100;
                      const durationMinutes = ev.end - ev.start;
                      const showWrappedLocation = durationMinutes >= 120;
                      return (
                        <div
                          key={ev.id}
                          className="absolute left-1 right-1 rounded-md border border-blue-200 bg-blue-100 px-2 py-1.5 text-[11px] leading-tight text-blue-950 shadow-sm overflow-hidden"
                          style={{
                            top: `${topPct}%`,
                            height: `${Math.max(heightPct, 4)}%`,
                          }}
                          title={`${ev.code} ${ev.section} (${dayLabel})`}
                        >
                          <div className="font-semibold truncate">
                            {ev.code} {ev.section || "TBA"}
                          </div>
                          {ev.instructor ? (
                            <div className="truncate text-blue-900/80">{ev.instructor}</div>
                          ) : null}
                          <div className="truncate">{ev.sectionType}</div>
                          <div className="truncate">
                            {toTimeLabel(ev.start)} - {toTimeLabel(ev.end)}
                          </div>
                          {showWrappedLocation ? (
                            <div className="mt-0.5 wrap-break-word whitespace-normal">
                              {ev.location}
                            </div>
                          ) : (
                            <div className="truncate">{ev.location}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

