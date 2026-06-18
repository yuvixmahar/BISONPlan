import {
  getCourseCode,
  getCourseSection,
  getCourseTitle,
  getInstructorName,
  getMeetingLocation,
  getMeetingTimes,
  PLANNER_DAY_KEYS,
} from "./course.js";
import { getCourseDateRange, parseCourseDate } from "./planner.js";
import { formatTimeRangeFromMinutes, toMinutes } from "./time.js";

export const DEFAULT_START_MINUTES = 8 * 60;
export const DEFAULT_END_MINUTES = 22 * 60;
export const EVENT_GAP_PX = 2;

function roundDownToHour(minutes) {
  return Math.floor(minutes / 60) * 60;
}

function roundUpToHour(minutes) {
  return Math.ceil(minutes / 60) * 60;
}

export function getTimeRangeForEvents(events) {
  if (!events.length) {
    return {
      startMinutes: DEFAULT_START_MINUTES,
      endMinutes: DEFAULT_END_MINUTES,
      totalMinutes: DEFAULT_END_MINUTES - DEFAULT_START_MINUTES,
    };
  }

  let minStart = Math.min(...events.map((ev) => ev.start));
  let maxEnd = Math.max(...events.map((ev) => ev.end));

  minStart = roundDownToHour(Math.max(DEFAULT_START_MINUTES, minStart - 5));
  maxEnd = roundUpToHour(Math.min(DEFAULT_END_MINUTES, maxEnd + 5));

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

/** Side-by-side columns for concurrent classes; back-to-back classes share a column. */
export function layoutDayEvents(dayEvents) {
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

export function normalizePlannerEvents(courses) {
  const out = [];

  for (const course of courses) {
    const plannerId = course?._plannerId || "";
    const code = getCourseCode(course);
    const section = getCourseSection(course);
    const instructor = getInstructorName(course);
    const title = getCourseTitle(course);
    const { start: rangeStart, end: rangeEnd } = getCourseDateRange(course);
    const meetings = getMeetingTimes(course);

    for (let idx = 0; idx < meetings.length; idx += 1) {
      const mt = meetings[idx];
      const start = toMinutes(mt.beginTime);
      const end = toMinutes(mt.endTime);
      if (start == null || end == null || end <= start) continue;

      const meetingStart = parseCourseDate(mt.startDate) || rangeStart;
      const meetingEnd = parseCourseDate(mt.endDate) || rangeEnd;
      const activeStart = meetingStart || rangeStart;
      const activeEnd = meetingEnd || rangeEnd;
      const sectionType = mt.meetingTypeDescription || mt.meetingType || "Class";

      for (const dayKey of PLANNER_DAY_KEYS) {
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
          location: getMeetingLocation(mt),
          rangeStart: activeStart,
          rangeEnd: activeEnd,
        });
      }
    }
  }

  return out;
}

export function buildEventTooltip(ev) {
  return [
    `${ev.code}${ev.section ? ` ${ev.section}` : ""}`,
    formatTimeRangeFromMinutes(ev.start, ev.end),
    ev.sectionType,
    ev.location,
    ev.instructor,
  ]
    .filter(Boolean)
    .join(" · ");
}
