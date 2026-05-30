import { useEffect, useMemo, useState } from "react";
import { getInstructorName } from "../utils/course.js";
import {
  PLANNER_TERMS,
  addDays,
  buildWeekDays,
  buildWeekStarts,
  dateWithinRange,
  formatDateRange,
  formatDayHeader,
  formatWeekNavLabel,
  getCourseDateRange,
  getDayKeyFromDate,
  getPlannerBounds,
  getWeekStartMonday,
  parseCourseDate,
  startOfDay,
} from "../utils/planner.js";

const START_MINUTES = 8 * 60;
const END_MINUTES = 22 * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;
const GRID_HEIGHT_PX = 1180;

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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
    const meetings = getMeetings(course);

    for (let idx = 0; idx < meetings.length; idx += 1) {
      const mt = meetings[idx];
      const start = toMinutes(mt.beginTime);
      const end = toMinutes(mt.endTime);
      if (start == null || end == null || end <= start) continue;

      const meetingStart = parseCourseDate(mt.startDate) || rangeStart;
      const meetingEnd = parseCourseDate(mt.endDate) || rangeEnd;
      const activeStart = meetingStart || rangeStart;
      const activeEnd = meetingEnd || rangeEnd;

      const locationParts = [
        mt.buildingDescription || mt.building || "",
        mt.room ? `Room ${mt.room}` : "",
      ].filter(Boolean);
      const location = locationParts.join(" - ") || "Location TBA";
      const sectionType = mt.meetingTypeDescription || mt.meetingType || "Class";
      const dayKeys = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];

      for (const dayKey of dayKeys) {
        if (!mt?.[dayKey]) continue;
        out.push({
          id: `${plannerId}-${idx}-${dayKey}-${start}-${end}`,
          dayKey,
          start,
          end,
          code,
          section,
          instructor,
          title,
          sectionType,
          location,
          rangeStart: activeStart,
          rangeEnd: activeEnd,
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

function WeekNavigator({ weekLabel, weekNumber, totalWeeks, onPrevious, onNext }) {
  const atStart = weekNumber <= 1;
  const atEnd = weekNumber >= totalWeeks;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={atStart}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous week"
      >
        ← Previous
      </button>

      <div className="text-center min-w-[180px]">
        <div className="text-sm font-semibold text-slate-900">{weekLabel}</div>
        <div className="text-xs text-slate-600 mt-0.5">
          Week {weekNumber} of {totalWeeks}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        className="px-3 py-1.5 text-sm rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next week"
      >
        Next →
      </button>
    </div>
  );
}

function WeeklyScheduleGrid({ weekStart, events }) {
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  const eventsByDateKey = useMemo(() => {
    const map = new Map();
    for (const dayDate of weekDays) {
      const dayKey = getDayKeyFromDate(dayDate);
      const dateKey = toDateKey(dayDate);
      const dayEvents = events
        .filter(
          (ev) =>
            ev.dayKey === dayKey &&
            dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd)
        )
        .sort((a, b) => a.start - b.start);
      map.set(dateKey, { dayDate, dayEvents });
    }
    return map;
  }, [events, weekDays]);

  const hours = useMemo(() => {
    const result = [];
    for (let t = START_MINUTES; t <= END_MINUTES; t += 60) result.push(t);
    return result;
  }, []);

  const hasAnyEvents = [...eventsByDateKey.values()].some(
    ({ dayEvents }) => dayEvents.length > 0
  );

  return (
    <div className="space-y-3">
      {!hasAnyEvents ? (
        <div className="text-sm text-slate-600 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center">
          No classes scheduled this week.
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[860px] grid grid-cols-[70px_repeat(7,minmax(110px,1fr))] gap-2">
          <div />
          {weekDays.map((dayDate) => {
            const { dayLabel, dateLabel } = formatDayHeader(dayDate);
            const dateKey = toDateKey(dayDate);
            const dayKey = getDayKeyFromDate(dayDate);
            const hasPossibleClass = events.some(
              (ev) =>
                ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd)
            );

            return (
              <div
                key={dateKey}
                className={`px-2 py-1 rounded-md ${
                  hasPossibleClass ? "bg-white" : "bg-slate-50 text-slate-400"
                }`}
              >
                <div className="text-xs font-semibold">{dayLabel}</div>
                <div className="text-[11px] mt-0.5">{dateLabel}</div>
              </div>
            );
          })}

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

          {weekDays.map((dayDate) => {
            const dateKey = toDateKey(dayDate);
            const { dayEvents } = eventsByDateKey.get(dateKey) || { dayEvents: [] };
            const dayKey = getDayKeyFromDate(dayDate);
            const hasPossibleClass = events.some(
              (ev) =>
                ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd)
            );

            return (
              <div
                key={`grid-${dateKey}`}
                className={`relative rounded-lg border ${
                  hasPossibleClass
                    ? "border-slate-200 bg-slate-50/40"
                    : "border-slate-100 bg-slate-50/20"
                }`}
                style={{ height: `${GRID_HEIGHT_PX}px` }}
              >
                {hours.map((minute) => (
                  <div
                    key={`${dateKey}-${minute}`}
                    className="absolute left-0 right-0 border-t border-slate-200/80"
                    style={{ top: `${((minute - START_MINUTES) / TOTAL_MINUTES) * 100}%` }}
                  />
                ))}
                {dayEvents.map((ev) => {
                  const topPct = ((ev.start - START_MINUTES) / TOTAL_MINUTES) * 100;
                  const heightPct = ((ev.end - ev.start) / TOTAL_MINUTES) * 100;
                  const durationMinutes = ev.end - ev.start;
                  const showWrappedLocation = durationMinutes >= 120;
                  const { dayLabel } = formatDayHeader(dayDate);

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
                        <div className="mt-0.5 wrap-break-word whitespace-normal">{ev.location}</div>
                      ) : (
                        <div className="truncate">{ev.location}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function findInitialWeekIndex(weekStarts) {
  if (!weekStarts.length) return 0;
  const today = startOfDay(new Date());
  const index = weekStarts.findIndex((weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    return today >= weekStart && today <= weekEnd;
  });
  return index >= 0 ? index : 0;
}

export default function WeeklyPlanner({
  activePlannerTerm,
  setActivePlannerTerm,
  plannerByTerm,
  onRemoveCourse,
}) {
  const plannedCourses = plannerByTerm[activePlannerTerm] || [];
  const events = useMemo(() => normalizeEvents(plannedCourses), [plannedCourses]);
  const bounds = useMemo(
    () => getPlannerBounds(plannedCourses, activePlannerTerm),
    [plannedCourses, activePlannerTerm]
  );
  const weekStarts = useMemo(
    () => buildWeekStarts(bounds.start, bounds.end),
    [bounds.start, bounds.end]
  );
  const [weekIndex, setWeekIndex] = useState(0);

  useEffect(() => {
    setWeekIndex(findInitialWeekIndex(weekStarts));
  }, [activePlannerTerm, weekStarts]);

  const safeWeekIndex = Math.min(Math.max(weekIndex, 0), Math.max(weekStarts.length - 1, 0));
  const currentWeekStart = weekStarts[safeWeekIndex] || getWeekStartMonday(bounds.start);
  const activeTermLabel =
    PLANNER_TERMS.find((term) => term.key === activePlannerTerm)?.label || activePlannerTerm;

  return (
    <section className="mt-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-2xl text-slate-900">Week at a Glance</h2>
          <p className="text-sm text-slate-600 mt-1">
            Browse week by week from the first to last class date. Summer, fall, and winter all
            use the same calendar view.
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

            <WeekNavigator
              weekLabel={formatWeekNavLabel(currentWeekStart)}
              weekNumber={safeWeekIndex + 1}
              totalWeeks={weekStarts.length}
              onPrevious={() => setWeekIndex((prev) => Math.max(prev - 1, 0))}
              onNext={() =>
                setWeekIndex((prev) => Math.min(prev + 1, Math.max(weekStarts.length - 1, 0)))
              }
            />

            <WeeklyScheduleGrid weekStart={currentWeekStart} events={events} />
          </div>
        )}
      </div>
    </section>
  );
}
