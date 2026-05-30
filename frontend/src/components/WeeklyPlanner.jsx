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

const DEFAULT_START_MINUTES = 8 * 60;
const DEFAULT_END_MINUTES = 22 * 60;
const EVENT_GAP_PX = 2;
const GRID_HEIGHT_CLASS = "h-[min(calc(100vh-13rem),40rem)] min-h-72";
const GRID_LAYOUT_CLASS =
  "min-w-[940px] grid grid-cols-[72px_repeat(7,minmax(128px,1fr))] gap-2";

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

function roundDownToHour(minutes) {
  return Math.floor(minutes / 60) * 60;
}

function roundUpToHour(minutes) {
  return Math.ceil(minutes / 60) * 60;
}

function getTimeRangeForEvents(events) {
  if (!events.length) {
    return {
      startMinutes: DEFAULT_START_MINUTES,
      endMinutes: DEFAULT_END_MINUTES,
      totalMinutes: DEFAULT_END_MINUTES - DEFAULT_START_MINUTES,
    };
  }

  let minStart = Math.min(...events.map((ev) => ev.start));
  let maxEnd = Math.max(...events.map((ev) => ev.end));

  minStart = roundDownToHour(Math.max(DEFAULT_START_MINUTES, minStart - 15));
  maxEnd = roundUpToHour(Math.min(DEFAULT_END_MINUTES, maxEnd + 15));

  if (maxEnd <= minStart) {
    maxEnd = minStart + 60;
  }

  return {
    startMinutes: minStart,
    endMinutes: maxEnd,
    totalMinutes: maxEnd - minStart,
  };
}

function eventsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

/** Assign side-by-side columns for concurrent classes; back-to-back classes share a column. */
function layoutDayEvents(dayEvents) {
  if (!dayEvents.length) return [];

  const sorted = [...dayEvents].sort((a, b) => a.start - b.start || a.end - b.end);
  const clusters = [];
  let cluster = [];
  let clusterEnd = -1;

  for (const ev of sorted) {
    if (!cluster.length || ev.start < clusterEnd) {
      cluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.end);
    } else {
      clusters.push(cluster);
      cluster = [ev];
      clusterEnd = ev.end;
    }
  }
  if (cluster.length) clusters.push(cluster);

  const laidOut = [];

  for (const group of clusters) {
    const columns = [];

    for (const ev of group) {
      let placedColumn = -1;
      for (let col = 0; col < columns.length; col += 1) {
        const hasOverlap = columns[col].some((other) => eventsOverlap(other, ev));
        if (!hasOverlap) {
          placedColumn = col;
          break;
        }
      }
      if (placedColumn === -1) {
        placedColumn = columns.length;
        columns.push([]);
      }
      columns[placedColumn].push(ev);
    }

    const totalColumns = columns.length;
    for (let col = 0; col < columns.length; col += 1) {
      for (const ev of columns[col]) {
        laidOut.push({ ev, column: col, totalColumns });
      }
    }
  }

  return laidOut;
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

  const weekVisibleEvents = useMemo(() => {
    const list = [];
    for (const dayDate of weekDays) {
      const dayKey = getDayKeyFromDate(dayDate);
      for (const ev of events) {
        if (ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd)) {
          list.push(ev);
        }
      }
    }
    return list;
  }, [events, weekDays]);

  const timeRange = useMemo(
    () => getTimeRangeForEvents(weekVisibleEvents),
    [weekVisibleEvents]
  );

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
      map.set(dateKey, {
        dayDate,
        dayEvents,
        layout: layoutDayEvents(dayEvents),
      });
    }
    return map;
  }, [events, weekDays]);

  const hours = useMemo(() => {
    const result = [];
    for (
      let t = timeRange.startMinutes;
      t <= timeRange.endMinutes;
      t += 60
    ) {
      result.push(t);
    }
    return result;
  }, [timeRange.startMinutes, timeRange.endMinutes]);

  const hasAnyEvents = weekVisibleEvents.length > 0;

  const eventPosition = (ev) => {
    const { startMinutes, totalMinutes } = timeRange;
    const topPct = ((ev.start - startMinutes) / totalMinutes) * 100;
    const heightPct = ((ev.end - ev.start) / totalMinutes) * 100;
    return { topPct, heightPct, durationMinutes: ev.end - ev.start };
  };

  return (
    <div className="space-y-3">
      {!hasAnyEvents ? (
        <div className="text-sm text-slate-600 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center">
          No classes scheduled this week.
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className={GRID_LAYOUT_CLASS}>
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

          <div className={`relative ${GRID_HEIGHT_CLASS}`}>
            {hours.map((minute) => (
              <div
                key={minute}
                className="absolute text-[10px] text-slate-500 -translate-y-1/2"
                style={{
                  top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%`,
                }}
              >
                {toTimeLabel(minute)}
              </div>
            ))}
          </div>

          {weekDays.map((dayDate) => {
            const dateKey = toDateKey(dayDate);
            const { layout } = eventsByDateKey.get(dateKey) || { layout: [] };
            const dayKey = getDayKeyFromDate(dayDate);
            const hasPossibleClass = events.some(
              (ev) =>
                ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd)
            );

            return (
              <div
                key={`grid-${dateKey}`}
                className={`relative rounded-lg border ${GRID_HEIGHT_CLASS} ${
                  hasPossibleClass
                    ? "border-slate-200 bg-slate-50/40"
                    : "border-slate-100 bg-slate-50/20"
                }`}
              >
                {hours.map((minute) => (
                  <div
                    key={`${dateKey}-${minute}`}
                    className="absolute left-0 right-0 border-t border-slate-200/80"
                    style={{
                      top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%`,
                    }}
                  />
                ))}
                {layout.map(({ ev, column, totalColumns }) => {
                  const { topPct, heightPct } = eventPosition(ev);
                  const { dayLabel } = formatDayHeader(dayDate);
                  const widthPct = 100 / totalColumns;
                  const leftPct = column * widthPct;

                  return (
                    <div
                      key={ev.id}
                      className="absolute rounded-md border border-blue-200 bg-blue-100 text-blue-950 shadow-sm overflow-hidden box-border px-2 py-1.5 text-[11px] leading-[1.35]"
                      style={{
                        top: `calc(${topPct}% + ${EVENT_GAP_PX / 2}px)`,
                        height: `calc(${heightPct}% - ${EVENT_GAP_PX}px)`,
                        left: `calc(${leftPct}% + 3px)`,
                        width: `calc(${widthPct}% - 6px)`,
                      }}
                      title={[
                        `${ev.code}${ev.section ? ` ${ev.section}` : ""}`,
                        `${toTimeLabel(ev.start)} – ${toTimeLabel(ev.end)}`,
                        ev.sectionType,
                        ev.location,
                        ev.instructor,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <div className="font-semibold wrap-break-word">
                        {ev.code}
                        {ev.section ? ` ${ev.section}` : ""}
                      </div>
                      <div className="wrap-break-word text-blue-900/90 text-[10px]">
                        {toTimeLabel(ev.start)} – {toTimeLabel(ev.end)}
                      </div>
                      <div className="wrap-break-word text-blue-900 font-medium mt-0.5">
                        {ev.sectionType}
                      </div>
                      <div className="wrap-break-word text-blue-900/80 mt-0.5">{ev.location}</div>
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
