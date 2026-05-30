import { useMemo } from "react";
import SummerDateTimeline from "./SummerDateTimeline.jsx";
import { getInstructorName } from "../utils/course.js";
import {
  PLANNER_TERMS,
  formatDateRange,
  formatMonthSpan,
  getCourseDateRange,
  groupCoursesByDateRange,
} from "../utils/planner.js";

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
    const { start: rangeStart, end: rangeEnd } = getCourseDateRange(course);
    const dateSpan =
      rangeStart && rangeEnd ? formatMonthSpan(rangeStart, rangeEnd) : "";
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
          dateSpan,
        });
      }
    }
  }
  return out;
}

function CourseChip({ course, termKey, onRemoveCourse }) {
  const code = courseCode(course);
  const section = getSection(course);
  const instructor = getInstructor(course);
  const id = course?._plannerId || `${code}-${section}`;
  const { start, end } = getCourseDateRange(course);
  const dateLabel = start && end ? formatDateRange(start, end) : null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
      <span className="inline-flex flex-col sm:flex-row sm:items-center sm:gap-1">
        <span>
          {code}
          {section ? ` · ${section}` : ""}
          {instructor ? ` · ${instructor}` : ""}
        </span>
        {dateLabel ? (
          <span className="text-slate-500 sm:before:content-['·'] sm:before:mr-1">{dateLabel}</span>
        ) : null}
      </span>
      <button
        type="button"
        className="text-slate-500 hover:text-slate-800"
        onClick={() => onRemoveCourse(termKey, id)}
        aria-label={`Remove ${code} from planner`}
      >
        ×
      </button>
    </span>
  );
}

function WeeklyScheduleGrid({ events, showDateSpan = false }) {
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

  if (!events.length) {
    return (
      <div className="text-sm text-slate-600 rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center">
        No weekly meeting times for this session.
      </div>
    );
  }

  return (
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
                  {showDateSpan && ev.dateSpan ? (
                    <div className="truncate text-blue-900/70">{ev.dateSpan}</div>
                  ) : null}
                  {ev.instructor ? (
                    <div className="truncate text-blue-900/80">{ev.instructor}</div>
                  ) : null}
                  <div className="truncate">{ev.sectionType}</div>
                  <div className="truncate">
                    {toTimeLabel(ev.start)} - {toTimeLabel(ev.end)}
                  </div>
                  {showWrappedLocation ? (
                    <div className="mt-0.5 wrap-break-word whitespace-normal">{ev.location}</div>
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
  );
}

function SummerPlannerView({ plannedCourses, termKey, onRemoveCourse }) {
  const sessionGroups = useMemo(
    () => groupCoursesByDateRange(plannedCourses),
    [plannedCourses]
  );

  return (
    <div className="space-y-6">
      <SummerDateTimeline courses={plannedCourses} />

      {sessionGroups.map((group) => {
        const sessionLabel =
          group.range.start && group.range.end
            ? formatDateRange(group.range.start, group.range.end)
            : "Unknown session dates";
        const monthSpan =
          group.range.start && group.range.end
            ? formatMonthSpan(group.range.start, group.range.end)
            : null;
        const events = normalizeEvents(group.courses);

        return (
          <section
            key={group.key}
            className="rounded-lg border border-slate-200 bg-white p-3 md:p-4 space-y-4"
            aria-label={`Summer session ${sessionLabel}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{sessionLabel}</h3>
                {monthSpan ? (
                  <p className="text-xs text-slate-600 mt-0.5">
                    Runs {monthSpan} · {group.courses.length}{" "}
                    {group.courses.length === 1 ? "course" : "courses"}
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 mt-0.5">
                    {group.courses.length}{" "}
                    {group.courses.length === 1 ? "course" : "courses"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {group.courses.map((course) => (
                <CourseChip
                  key={course?._plannerId || courseCode(course)}
                  course={course}
                  termKey={termKey}
                  onRemoveCourse={onRemoveCourse}
                />
              ))}
            </div>

            <WeeklyScheduleGrid events={events} showDateSpan />
          </section>
        );
      })}
    </div>
  );
}

export default function WeeklyPlanner({
  activePlannerTerm,
  setActivePlannerTerm,
  plannerByTerm,
  onRemoveCourse,
}) {
  const plannedCourses = plannerByTerm[activePlannerTerm] || [];
  const events = useMemo(() => normalizeEvents(plannedCourses), [plannedCourses]);
  const activeTermLabel =
    PLANNER_TERMS.find((term) => term.key === activePlannerTerm)?.label || activePlannerTerm;

  return (
    <section className="mt-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-2xl text-slate-900">Week at a Glance</h2>
          <p className="text-sm text-slate-600 mt-1">
            {activePlannerTerm === "summer"
              ? "Summer courses are grouped by date span so you can compare May–June, July–August, and full-summer schedules."
              : "Visualize class times and locations across Fall, Winter, and Summer terms."}
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-slate-200 bg-white p-1"
          role="tablist"
          aria-label="Planner term"
        >
          {PLANNER_TERMS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activePlannerTerm === key}
              onClick={() => setActivePlannerTerm(key)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                activePlannerTerm === key
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        {plannedCourses.length === 0 ? (
          <div className="text-sm text-slate-600">
            No courses added yet for {activeTermLabel.toLowerCase()}. Use “Add to Planner” from
            search results.
          </div>
        ) : activePlannerTerm === "summer" ? (
          <SummerPlannerView
            plannedCourses={plannedCourses}
            termKey={activePlannerTerm}
            onRemoveCourse={onRemoveCourse}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {plannedCourses.map((course) => (
                <CourseChip
                  key={course?._plannerId || courseCode(course)}
                  course={course}
                  termKey={activePlannerTerm}
                  onRemoveCourse={onRemoveCourse}
                />
              ))}
            </div>
            <WeeklyScheduleGrid events={events} />
          </div>
        )}
      </div>
    </section>
  );
}
