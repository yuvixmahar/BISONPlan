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
  getTimeRangeForEvents,
  layoutDayEvents,
  normalizePlannerEvents,
} from "../utils/plannerSchedule.js";
import { formatMinutesAmPm, formatTimeRangeCompact } from "../utils/time.js";

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
    <span className="inline-flex items-center gap-2 rounded-full border border-bison-border bg-bison-cream px-3 py-1 text-xs text-bison-text">
      <span className="inline-flex flex-col sm:flex-row sm:items-center sm:gap-1">
        <span>
          {code}
          {section ? ` · ${section}` : ""}
          {instructor ? ` · ${instructor}` : ""}
        </span>
        {dateLabel ? (
          <span className="text-bison-text-muted sm:before:content-['·'] sm:before:mr-1">{dateLabel}</span>
        ) : null}
      </span>
      <button
        type="button"
        className="cursor-pointer text-base leading-none text-bison-text-muted hover:text-bison-text"
        onClick={() => onRemoveCourse(termKey, id)}
        aria-label={`Remove ${code} from planner`}
      >
        ×
      </button>
    </span>
  );
}

function PlannerEventBlock({ ev, style, title }) {
  const codeLine = `${ev.code}${ev.section ? ` ${ev.section}` : ""}`;
  const timeLine = formatTimeRangeCompact(ev.start, ev.end);
  const locationLine = ev.location || "Location TBA";

  return (
    <div
      className="absolute box-border flex h-full min-h-0 flex-col overflow-hidden rounded border border-bison-gold/40 bg-bison-gold/25 px-1 py-px text-[9px] leading-[1.15] text-bison-brown shadow-sm"
      style={style}
      title={title}
    >
      <div className="shrink-0 font-semibold whitespace-nowrap">{codeLine}</div>
      <div className="shrink-0 whitespace-nowrap">{ev.sectionType}</div>
      <div className="shrink-0 whitespace-nowrap text-bison-brown/90">{timeLine}</div>
      <div className="min-h-0 text-bison-brown/80 leading-[1.1]">{locationLine}</div>
    </div>
  );
}

function WeekNavigator({ weekLabel, weekNumber, totalWeeks, onPrevious, onNext }) {
  const atStart = weekNumber <= 1;
  const atEnd = weekNumber >= totalWeeks;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-bison-border bg-bison-cream px-3 py-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={atStart}
        className="px-3 py-1.5 text-sm rounded-md border border-bison-border bg-white text-bison-text hover:bg-bison-gold/15 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous week"
      >
        ← Previous
      </button>

      <div className="text-center min-w-[180px]">
        <div className="text-sm font-semibold text-bison-text">{weekLabel}</div>
        <div className="text-xs text-bison-text-muted mt-0.5">
          Week {weekNumber} of {totalWeeks}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        className="px-3 py-1.5 text-sm rounded-md border border-bison-border bg-white text-bison-text hover:bg-bison-gold/15 disabled:opacity-40 disabled:cursor-not-allowed"
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
    return { topPct, heightPct };
  };

  return (
    <div className="space-y-3">
      {!hasAnyEvents ? (
        <div className="text-sm text-bison-text-muted rounded-lg border border-dashed border-bison-border px-4 py-3 text-center">
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
                  hasPossibleClass ? "bg-white" : "bg-bison-cream text-bison-text-muted/80"
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
                className="absolute text-[10px] text-bison-text-muted -translate-y-1/2"
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
                    ? "border-bison-border bg-bison-cream/40"
                    : "border-bison-border/70 bg-bison-cream/20"
                }`}
              >
                {hours.map((minute) => (
                  <div
                    key={`${dateKey}-${minute}`}
                    className="absolute left-0 right-0 border-t border-bison-border/80"
                    style={{
                      top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%`,
                    }}
                  />
                ))}
                {layout.map(({ ev, column, totalColumns }) => {
                  const { topPct, heightPct } = eventPosition(ev);
                  const widthPct = 100 / totalColumns;
                  const leftPct = column * widthPct;

                  return (
                    <PlannerEventBlock
                      key={ev.id}
                      ev={ev}
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
          <h2 className="font-heading text-2xl text-bison-text">Week at a Glance</h2>
          <p className="text-sm text-bison-text-muted mt-1">
            Browse week by week from the first to last class date. Summer, fall, and winter all
            use the same calendar view.
          </p>
        </div>
        <div
          className="inline-flex rounded-lg border border-bison-border bg-white p-1"
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
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activePlannerTerm === key
                  ? "bg-bison-gold text-bison-brown font-semibold"
                  : "text-bison-text hover:bg-bison-gold/15"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-bison-border bg-white p-3 md:p-4">
        {plannedCourses.length === 0 ? (
          <div className="text-sm text-bison-text-muted">
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
