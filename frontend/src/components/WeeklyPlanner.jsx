import { useEffect, useMemo, useState } from "react";
import {
  getCourseCode,
  getCourseSection,
  getInstructorName,
} from "../utils/course.js";
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
  startOfDay,
} from "../utils/planner.js";
import {
  buildEventTooltip,
  EVENT_GAP_PX,
  getEventCardDensity,
  getTimeRangeForEvents,
  layoutDayEvents,
  normalizePlannerEvents,
} from "../utils/plannerSchedule.js";
import { formatMinutesAmPm, formatTimeRangeFromMinutes } from "../utils/time.js";

const GRID_HEIGHT_DEFAULT = "h-[min(calc(100vh-13rem),40rem)] min-h-72";
const GRID_LAYOUT_CLASS =
  "min-w-[940px] grid grid-cols-[72px_repeat(7,minmax(128px,1fr))] gap-2";

function getGridHeightClass(totalMinutes) {
  if (totalMinutes <= 7 * 60) return GRID_HEIGHT_DEFAULT;
  if (totalMinutes <= 9 * 60) {
    return "h-[min(calc(100vh-12rem),44rem)] min-h-80";
  }
  return "h-[min(calc(100vh-11rem),52rem)] min-h-[22rem]";
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CourseChip({ course, termKey, onRemoveCourse }) {
  const code = getCourseCode(course);
  const section = getCourseSection(course);
  const instructor = getInstructorName(course);
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

function PlannerEventBlock({ ev, density, style, title }) {
  const codeLine = `${ev.code}${ev.section ? ` ${ev.section}` : ""}`;
  const timeLine = formatTimeRangeFromMinutes(ev.start, ev.end);
  const locationLine = ev.location || "Location TBA";

  const shellClass =
    density === "tight"
      ? "px-1 py-0.5 text-[10px] leading-[1.2]"
      : density === "compact"
        ? "px-1.5 py-1 text-[10px] leading-[1.25]"
        : "px-2 py-1.5 text-[11px] leading-snug";

  return (
    <div
      className={`absolute rounded-md border border-blue-200 bg-blue-100 text-blue-950 shadow-sm overflow-hidden box-border ${shellClass}`}
      style={style}
      title={title}
    >
      {density === "tight" ? (
        <>
          <div className="font-semibold truncate">{codeLine}</div>
          <div className="truncate text-blue-900/90 text-[9px]">
            {timeLine} · {ev.sectionType}
          </div>
          <div className="truncate text-blue-900/75 text-[9px]">{locationLine}</div>
        </>
      ) : density === "compact" ? (
        <>
          <div className="font-semibold wrap-break-word leading-tight">{codeLine}</div>
          <div className="wrap-break-word text-blue-900/90 text-[9px] leading-tight">
            {timeLine} · {ev.sectionType}
          </div>
          <div className="wrap-break-word text-blue-900/80 text-[9px] leading-tight line-clamp-2">
            {locationLine}
          </div>
        </>
      ) : (
        <>
          <div className="font-semibold wrap-break-word">{codeLine}</div>
          <div className="wrap-break-word text-blue-900/90 text-[10px]">{timeLine}</div>
          <div className="wrap-break-word text-blue-900 font-medium text-[10px] leading-tight">
            {ev.sectionType}
          </div>
          <div className="wrap-break-word text-blue-900/80 text-[10px] leading-tight line-clamp-2">
            {locationLine}
          </div>
        </>
      )}
    </div>
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
  const gridHeightClass = getGridHeightClass(timeRange.totalMinutes);

  const eventPosition = (ev) => {
    const { startMinutes, totalMinutes } = timeRange;
    const topPct = ((ev.start - startMinutes) / totalMinutes) * 100;
    const heightPct = ((ev.end - ev.start) / totalMinutes) * 100;
    const durationMinutes = ev.end - ev.start;
    return {
      topPct,
      heightPct,
      durationMinutes,
      density: getEventCardDensity(durationMinutes, heightPct),
    };
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

          <div className={`relative ${gridHeightClass}`}>
            {hours.map((minute) => (
              <div
                key={minute}
                className="absolute text-[10px] text-slate-500 -translate-y-1/2"
                style={{
                  top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%`,
                }}
              >
                {formatMinutesAmPm(minute)}
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
                className={`relative rounded-lg border ${gridHeightClass} ${
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
                  const { topPct, heightPct, density } = eventPosition(ev);
                  const widthPct = 100 / totalColumns;
                  const leftPct = column * widthPct;

                  return (
                    <PlannerEventBlock
                      key={ev.id}
                      ev={ev}
                      density={density}
                      title={buildEventTooltip(ev)}
                      style={{
                        top: `calc(${topPct}% + ${EVENT_GAP_PX / 2}px)`,
                        height: `calc(${heightPct}% - ${EVENT_GAP_PX}px)`,
                        left: `calc(${leftPct}% + 3px)`,
                        width: `calc(${widthPct}% - 6px)`,
                      }}
                    />
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
  const events = useMemo(() => normalizePlannerEvents(plannedCourses), [plannedCourses]);
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
                  key={course?._plannerId || getCourseCode(course)}
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
