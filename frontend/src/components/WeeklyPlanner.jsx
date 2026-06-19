import { useEffect, useMemo, useRef, useState } from "react";
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

// Day abbreviations for the compact mobile header
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getGridHeightClass(totalMinutes) {
  if (totalMinutes <= 7 * 60) return "h-[min(calc(100vh-13rem),40rem)] min-h-72";
  if (totalMinutes <= 9 * 60) return "h-[min(calc(100vh-12rem),44rem)] min-h-80";
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

function CourseListDrawer({ courses, termKey, onRemoveCourse, open, onClose }) {
  const overlayRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Open: mount first, then trigger enter animation next frame
  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-300"
        style={{ opacity: animating ? 1 : 0 }}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="relative z-10 rounded-t-2xl bg-white shadow-xl flex flex-col max-h-[80vh] transition-transform duration-300 ease-out"
        style={{ transform: animating ? "translateY(0)" : "translateY(100%)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Planned courses"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-bison-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-bison-border">
          <span className="font-heading font-semibold text-bison-text text-base">
            Planned Courses
            <span className="ml-2 text-sm font-normal text-bison-text-muted">
              ({courses.length})
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded border border-bison-border px-2 py-1 text-sm hover:bg-bison-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold focus-visible:ring-offset-2"
          >
            Close
          </button>
        </div>

        {/* Course rows */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {courses.map((course) => {
            const code = getCourseCode(course);
            const section = getCourseSection(course);
            const instructor = getInstructorName(course);
            const id = course?._plannerId || `${code}-${section}`;
            const { start, end } = getCourseDateRange(course);
            const dateLabel = start && end ? formatDateRange(start, end) : null;

            return (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-xl border border-bison-border bg-bison-cream px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-bison-text truncate">
                    {code}{section ? ` · ${section}` : ""}
                  </div>
                  {instructor && (
                    <div className="text-xs text-bison-text-muted mt-0.5 truncate">{instructor}</div>
                  )}
                  {dateLabel && (
                    <div className="text-xs text-bison-text-muted/70 mt-0.5">{dateLabel}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveCourse(termKey, id)}
                  aria-label={`Remove ${code}`}
                  className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-bison-border bg-white text-bison-text-muted hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

function abbreviateSectionType(raw) {
  if (!raw) return "";
  const s = raw.toLowerCase();
  if (s.includes("lab")) return "Lab";
  if (s.includes("tut")) return "Tut";
  if (s.includes("lec")) return "Lec";
  if (s.includes("semi")) return "Sem";
  return "";
}

function fullSectionType(raw) {
  if (!raw) return "";
  const s = raw.toLowerCase();
  if (s.includes("lab")) return "Laboratory";
  if (s.includes("tut")) return "Tutorial";
  if (s.includes("lec")) return "Lecture";
  if (s.includes("semi")) return "Seminar";
  return raw;
}

function EventPopover({ ev, anchorRect }) {
  const timeLine = formatTimeRangeCompact(ev.start, ev.end);
  const type = fullSectionType(ev.sectionType);
  const POPOVER_WIDTH = 176; // w-44 = 11rem = 176px

  // Position above the card; flip below if not enough room at top
  const spaceAbove = anchorRect.top;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const showBelow = spaceAbove < 120 && spaceBelow > spaceAbove;

  const top = showBelow
    ? anchorRect.bottom + 6
    : anchorRect.top - 6;
  const cardCenterX = anchorRect.left + anchorRect.width / 2;
  const left = Math.min(
    Math.max(cardCenterX - POPOVER_WIDTH / 2, 8),
    window.innerWidth - POPOVER_WIDTH - 8
  );

  return (
    <div
      className="fixed z-[200] w-44 rounded-lg border border-bison-gold bg-white shadow-lg px-3 py-2 text-bison-brown"
      style={{ top, left, transform: showBelow ? "none" : "translateY(-100%)" }}
      role="tooltip"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="font-semibold text-[11px] leading-tight mb-1">
        {ev.code}{ev.section ? ` ${ev.section}` : ""}
      </div>
      <div className="text-[10px] leading-snug space-y-0.5">
        <div>{timeLine}</div>
        {type ? <div>{type}</div> : null}
        <div>{ev.location || "TBA"}</div>
        {ev.instructor ? <div className="text-bison-brown/70">{ev.instructor}</div> : null}
      </div>
    </div>
  );
}

function PlannerEventBlock({ ev, variant, style, title, mode = "desktop", calendarDays = 5, isPopoverOpen = false, anchorRect = null, onPopoverToggle }) {
  const typeAbbr = abbreviateSectionType(ev.sectionType);
  const codeSection = `${ev.code}${ev.section ? ` ${ev.section}` : ""}`;
  const codeLine = `${codeSection}${typeAbbr ? ` – ${typeAbbr}` : ""}`;
  const timeLine = formatTimeRangeCompact(ev.start, ev.end);
  const locationLine = ev.location || "TBA";

  if (mode === "mobile") {
    const is7day = calendarDays === 7;
    return (
      <div
        className="absolute box-border flex h-full min-h-0 flex-col overflow-visible rounded border border-bison-gold bg-[#f7e6bb] text-bison-brown shadow-sm px-0.5 py-px cursor-pointer"
        style={style}
        title={title}
        onPointerDown={(e) => { e.stopPropagation(); onPopoverToggle?.(e.currentTarget.getBoundingClientRect()); }}
      >
        {is7day ? (
          <>
            <div className="font-semibold leading-[1.2] text-[8px] break-words">{codeSection}</div>
            <div className="leading-[1.2] text-[7.5px] break-words text-bison-brown/80">{timeLine}</div>
          </>
        ) : (
          <>
            <div className="font-semibold leading-[1.2] text-[8px] break-words">{codeLine}</div>
            <div className="leading-[1.2] text-[7.5px] break-words text-bison-brown/80">{timeLine}</div>
            <div className="leading-[1.2] text-[7px] break-words text-bison-brown/70">{locationLine}</div>
          </>
        )}
        {isPopoverOpen && anchorRect && <EventPopover ev={ev} anchorRect={anchorRect} />}
      </div>
    );
  }

  if (mode === "tablet") {
    return (
      <div
        className="absolute box-border flex h-full min-h-0 flex-col overflow-hidden rounded border border-bison-gold bg-[#f7e6bb] text-bison-brown shadow-sm px-1 py-0.5"
        style={style}
        title={title}
      >
        <div className="font-semibold leading-[1.25] text-[9.5px] break-words">{codeLine}</div>
        <div className="leading-[1.25] text-[9px] break-words text-bison-brown/80">{timeLine}</div>
        <div className="leading-[1.2] text-[8.5px] break-words text-bison-brown/70">{locationLine}</div>
      </div>
    );
  }

  const shellClass =
    variant === "comfortable"
      ? "px-2 py-1.5 text-[10px] leading-[1.2]"
      : variant === "normal"
        ? "px-1.5 py-1 text-[9.5px] leading-[1.2]"
        : "px-1 py-px text-[9px] leading-[1.15]";

  return (
    <div
      className={`absolute box-border flex h-full min-h-0 flex-col overflow-hidden rounded border border-bison-gold bg-[#f7e6bb] text-bison-brown shadow-sm ${shellClass}`}
      style={style}
      title={title}
    >
      <div className="shrink-0 font-semibold whitespace-nowrap">{codeLine}</div>
      <div className="shrink-0 whitespace-nowrap">{ev.sectionType}</div>
      <div className="shrink-0 whitespace-nowrap text-bison-brown/90">{timeLine}</div>
      {variant === "comfortable" ? (
        <div className="shrink-0 whitespace-nowrap text-bison-brown/80">{ev.instructor || ""}</div>
      ) : null}
      <div className="min-h-0 text-bison-brown/80 leading-[1.1]">{locationLine}</div>
    </div>
  );
}

function WeekNavigator({ weekLabel, weekNumber, totalWeeks, onPrevious, onNext, calendarDays, onToggleCalendarDays }) {
  const atStart = weekNumber <= 1;
  const atEnd = weekNumber >= totalWeeks;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-bison-border bg-bison-cream px-3 py-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={atStart}
        className="shrink-0 px-3 py-1.5 text-sm rounded-md border border-bison-border bg-white text-bison-text hover:bg-bison-gold/15 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Previous week"
      >
        ← Prev
      </button>

      <div className="text-center flex-1 min-w-0">
        <div className="text-sm font-semibold text-bison-text">{weekLabel}</div>
        <div className="flex items-center justify-center gap-2 mt-0.5">
          <span className="text-xs text-bison-text-muted">Week {weekNumber} of {totalWeeks}</span>
          <div className="inline-flex rounded border border-bison-border bg-white text-[10px] overflow-hidden">
            <button
              type="button"
              onClick={() => calendarDays !== 5 && onToggleCalendarDays(5)}
              className={`px-1.5 py-0.5 transition-colors ${calendarDays === 5 ? "bg-bison-gold text-bison-brown font-semibold" : "text-bison-text-muted hover:bg-bison-gold/10"}`}
            >5d</button>
            <button
              type="button"
              onClick={() => calendarDays !== 7 && onToggleCalendarDays(7)}
              className={`px-1.5 py-0.5 transition-colors ${calendarDays === 7 ? "bg-bison-gold text-bison-brown font-semibold" : "text-bison-text-muted hover:bg-bison-gold/10"}`}
            >7d</button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={atEnd}
        className="shrink-0 px-3 py-1.5 text-sm rounded-md border border-bison-border bg-white text-bison-text hover:bg-bison-gold/15 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Next week"
      >
        Next →
      </button>
    </div>
  );
}

function WeeklyScheduleGrid({ weekStart, events, calendarDays = 7 }) {
  const allWeekDays = useMemo(() => buildWeekDays(weekStart), [weekStart]);
  // On mobile 5-day mode, slice to Mon–Fri; desktop always shows all 7
  const weekDays = useMemo(
    () => calendarDays === 5 ? allWeekDays.slice(0, 5) : allWeekDays,
    [allWeekDays, calendarDays]
  );
  const [popoverState, setPopoverState] = useState(null); // { id, rect }

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
        .filter((ev) => ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd))
        .sort((a, b) => a.start - b.start);
      map.set(dateKey, { dayDate, dayEvents, layout: layoutDayEvents(dayEvents) });
    }
    return map;
  }, [events, weekDays]);

  const hours = useMemo(() => {
    const result = [];
    for (let t = timeRange.startMinutes; t <= timeRange.endMinutes; t += 60) result.push(t);
    return result;
  }, [timeRange.startMinutes, timeRange.endMinutes]);

  const hasAnyEvents = weekVisibleEvents.length > 0;
  const gridHeightClass = getGridHeightClass(timeRange.totalMinutes);

  const eventPosition = (ev) => {
    const { startMinutes, totalMinutes } = timeRange;
    const topPct = ((ev.start - startMinutes) / totalMinutes) * 100;
    const heightPct = ((ev.end - ev.start) / totalMinutes) * 100;
    return { topPct, heightPct, durationMinutes: ev.end - ev.start };
  };

  if (!hasAnyEvents) {
    return (
      <div className="text-sm text-bison-text-muted rounded-lg border border-dashed border-bison-border px-4 py-3 text-center">
        No classes scheduled this week.
      </div>
    );
  }

  function renderDayColumn(dayDate, dateKey, mode) {
    const { layout } = eventsByDateKey.get(dateKey) || { layout: [] };
    const dayKey = getDayKeyFromDate(dayDate);
    const hasPossibleClass = events.some(
      (ev) => ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd)
    );
    const gap = mode === "mobile" ? 1 : mode === "tablet" ? 2 : EVENT_GAP_PX;
    const inset = mode === "mobile" ? 1 : mode === "tablet" ? 1 : 3;

    return (
      <div
        key={`grid-${dateKey}-${mode}`}
        className={`relative ${gridHeightClass} ${
          mode === "mobile"
            ? `border-l border-bison-border/50 ${hasPossibleClass ? "bg-bison-cream/40" : "bg-bison-cream/10"}`
            : `rounded border ${hasPossibleClass ? "border-bison-border bg-bison-cream/40" : "border-bison-border/40 bg-bison-cream/10"}`
        }`}
      >
        {hours.map((minute) => (
          <div
            key={`${dateKey}-${minute}`}
            className="absolute left-0 right-0 border-t border-bison-border/60"
            style={{ top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%` }}
          />
        ))}
        {layout.map(({ ev, column, totalColumns }) => {
          const { topPct, heightPct, durationMinutes } = eventPosition(ev);
          const widthPct = 100 / totalColumns;
          const leftPct = column * widthPct;
          const variant = durationMinutes >= 120 ? "comfortable" : durationMinutes >= 90 ? "normal" : "tight";
          return (
            <PlannerEventBlock
              key={ev.id}
              ev={ev}
              variant={variant}
              mode={mode}
              calendarDays={calendarDays}
              isPopoverOpen={popoverState?.id === ev.id}
              anchorRect={popoverState?.id === ev.id ? popoverState.rect : null}
              onPopoverToggle={(rect) => setPopoverState((s) => s?.id === ev.id ? null : { id: ev.id, rect })}
              title={buildEventTooltip(ev)}
              style={{
                top: `calc(${topPct}% + ${gap / 2}px)`,
                height: `calc(${heightPct}% - ${gap}px)`,
                left: `calc(${leftPct}% + ${inset}px)`,
                width: `calc(${widthPct}% - ${inset * 2}px)`,
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Mobile grid (< 640px) ── */}
      <div className="sm:hidden rounded border border-bison-border overflow-hidden" onPointerDown={() => setPopoverState(null)}>
        {/* Header row */}
        <div className="grid border-b border-bison-border" style={{ gridTemplateColumns: `24px repeat(${calendarDays}, 1fr)` }}>
          <div />
          {weekDays.map((dayDate, i) => {
            const dateKey = toDateKey(dayDate);
            const dayKey = getDayKeyFromDate(dayDate);
            const hasClass = events.some((ev) => ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd));
            return (
              <div key={dateKey} className={`text-center py-0.5 border-l border-bison-border/50 ${hasClass ? "bg-white" : "bg-bison-cream/60 text-bison-text-muted/60"}`}>
                <div className="text-[9px] font-semibold leading-tight">{DAY_ABBR[i]}</div>
                <div className="text-[8px] leading-tight">{dayDate.getDate()}</div>
              </div>
            );
          })}
        </div>
        {/* Body row: time labels + day columns */}
        <div className="grid" style={{ gridTemplateColumns: `24px repeat(${calendarDays}, 1fr)` }}>
          <div className={`relative ${gridHeightClass}`}>
            {hours.map((minute) => (
              <div key={minute} className="absolute left-0 right-0 text-[8px] text-bison-text-muted -translate-y-1/2 leading-none text-right pr-0.5"
                style={{ top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%` }}>
                {formatMinutesAmPm(minute).replace(/:00/g, "").replace(/ /g, "").toLowerCase()}
              </div>
            ))}
          </div>
          {weekDays.map((dayDate) => renderDayColumn(dayDate, toDateKey(dayDate), "mobile"))}
        </div>
      </div>

      {/* ── Tablet grid (640px–1023px) ── full width, no scroll */}
      <div className="hidden sm:grid lg:hidden w-full" style={{ gridTemplateColumns: `40px repeat(${calendarDays}, 1fr)`, gap: "3px" }}>
        <div />
        {weekDays.map((dayDate, i) => {
          const dateKey = toDateKey(dayDate);
          const dayKey = getDayKeyFromDate(dayDate);
          const hasClass = events.some((ev) => ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd));
          return (
            <div key={dateKey} className={`text-center rounded py-1 ${hasClass ? "bg-white" : "bg-bison-cream text-bison-text-muted/70"}`}>
              <div className="text-[11px] font-semibold leading-tight">{DAY_ABBR[i]}</div>
              <div className="text-[10px] leading-tight text-bison-text-muted">{dayDate.getDate()}</div>
            </div>
          );
        })}
        <div className={`relative ${gridHeightClass}`}>
          {hours.map((minute) => (
            <div key={minute} className="absolute left-0 text-[9px] text-bison-text-muted -translate-y-1/2 leading-none"
              style={{ top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%` }}>
              {formatMinutesAmPm(minute).replace(/:00/g, "").replace(/ /g, "")}
            </div>
          ))}
        </div>
        {weekDays.map((dayDate) => renderDayColumn(dayDate, toDateKey(dayDate), "tablet"))}
      </div>

      {/* ── Desktop grid (≥ 1024px) ── scrollable, spacious */}
      <div className="hidden lg:block overflow-x-auto">
        <div className={`grid gap-2 ${calendarDays === 5 ? "min-w-[700px] grid-cols-[72px_repeat(5,minmax(128px,1fr))]" : "min-w-[940px] grid-cols-[72px_repeat(7,minmax(128px,1fr))]"}`}>
          <div />
          {weekDays.map((dayDate) => {
            const { dayLabel, dateLabel } = formatDayHeader(dayDate);
            const dateKey = toDateKey(dayDate);
            const dayKey = getDayKeyFromDate(dayDate);
            const hasPossibleClass = events.some((ev) => ev.dayKey === dayKey && dateWithinRange(dayDate, ev.rangeStart, ev.rangeEnd));
            return (
              <div key={dateKey} className={`px-2 py-1 rounded-md ${hasPossibleClass ? "bg-white" : "bg-bison-cream text-bison-text-muted/80"}`}>
                <div className="text-xs font-semibold">{dayLabel}</div>
                <div className="text-[11px] mt-0.5">{dateLabel}</div>
              </div>
            );
          })}
          <div className={`relative ${gridHeightClass}`}>
            {hours.map((minute) => (
              <div key={minute} className="absolute text-[10px] text-bison-text-muted -translate-y-1/2"
                style={{ top: `${((minute - timeRange.startMinutes) / timeRange.totalMinutes) * 100}%` }}>
                {formatMinutesAmPm(minute)}
              </div>
            ))}
          </div>
          {weekDays.map((dayDate) => renderDayColumn(dayDate, toDateKey(dayDate), "desktop"))}
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [calendarDays, setCalendarDays] = useState(() => window.innerWidth < 640 ? 5 : 7);

  useEffect(() => {
    setWeekIndex(findInitialWeekIndex(weekStarts));
  }, [activePlannerTerm, weekStarts]);

  const safeWeekIndex = Math.min(Math.max(weekIndex, 0), Math.max(weekStarts.length - 1, 0));
  const currentWeekStart = weekStarts[safeWeekIndex] || getWeekStartMonday(bounds.start);
  const activeTermLabel =
    PLANNER_TERMS.find((term) => term.key === activePlannerTerm)?.label || activePlannerTerm;

  return (
    <section>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-heading text-3xl text-bison-text">Week at a Glance</h2>
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

      <div className="mt-4 rounded-xl border border-bison-border bg-white pl-1 pt-3 pr-1 pb-3 sm:p-3 md:p-4">
        {plannedCourses.length === 0 ? (
          <div className="text-sm text-bison-text-muted px-1 py-2">
            No courses added yet for {activeTermLabel.toLowerCase()}. Use &ldquo;Add to Planner&rdquo; from
            search results.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="px-3 sm:px-0 space-y-2 sm:space-y-4">
              {/* Mobile: compact summary bar → opens bottom sheet */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="sm:hidden w-full flex items-center justify-between gap-3 rounded-xl border border-bison-border bg-bison-cream px-4 py-3 text-left"
              >
                <div>
                  <span className="text-sm font-semibold text-bison-text">
                    {plannedCourses.length} course{plannedCourses.length !== 1 ? "s" : ""} planned
                  </span>
                  <div className="text-xs text-bison-text-muted mt-0.5 truncate">
                    {plannedCourses.slice(0, 3).map((c) => getCourseCode(c)).join(", ")}
                    {plannedCourses.length > 3 ? ` +${plannedCourses.length - 3} more` : ""}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-bison-brown font-medium">Manage →</span>
              </button>

              {/* Desktop: chip row */}
              <div className="hidden sm:flex flex-wrap gap-2">
                {plannedCourses.map((course) => (
                  <CourseChip
                    key={course?._plannerId || getCourseCode(course)}
                    course={course}
                    termKey={activePlannerTerm}
                    onRemoveCourse={onRemoveCourse}
                  />
                ))}
              </div>

              <CourseListDrawer
                courses={plannedCourses}
                termKey={activePlannerTerm}
                onRemoveCourse={(termKey, id) => {
                  onRemoveCourse(termKey, id);
                  if (plannedCourses.length <= 1) setDrawerOpen(false);
                }}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
              />

              <WeekNavigator
                weekLabel={formatWeekNavLabel(currentWeekStart)}
                weekNumber={safeWeekIndex + 1}
                totalWeeks={weekStarts.length}
                onPrevious={() => setWeekIndex((prev) => Math.max(prev - 1, 0))}
                onNext={() =>
                  setWeekIndex((prev) => Math.min(prev + 1, Math.max(weekStarts.length - 1, 0)))
                }
                calendarDays={calendarDays}
                onToggleCalendarDays={setCalendarDays}
              />
            </div>

            <WeeklyScheduleGrid weekStart={currentWeekStart} events={events} calendarDays={calendarDays} />
          </div>
        )}
      </div>
    </section>
  );
}
