import { getCourseSection, getMeetingTimes, pickFirst, PLANNER_DAY_KEYS } from "./course.js";
import { toMinutes } from "./time.js";

export const PLANNER_TERMS = [
  { key: "fall", label: "Fall" },
  { key: "winter", label: "Winter" },
  { key: "summer", label: "Summer" },
];

export function normalizePlannerTerm(termKey) {
  if (termKey === "winter") return "winter";
  if (termKey === "summer") return "summer";
  return "fall";
}

export function plannerTermFromTermDescription(description = "", termCode = "") {
  const code = String(termCode || "");
  if (/50$/.test(code)) return "summer";
  if (/10$/.test(code)) return "winter";
  if (/90$/.test(code)) return "fall";

  if (/winter/i.test(description)) return "winter";
  if (/summer/i.test(description)) return "summer";
  if (/fall/i.test(description)) return "fall";
  return "fall";
}

export function parseCourseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const parsed = new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getCourseDateRange(course) {
  let start = null;
  let end = null;

  for (const mt of getMeetingTimes(course)) {
    const meetingStart = parseCourseDate(mt.startDate);
    const meetingEnd = parseCourseDate(mt.endDate);
    if (meetingStart && (!start || meetingStart < start)) start = meetingStart;
    if (meetingEnd && (!end || meetingEnd > end)) end = meetingEnd;
  }

  return { start, end };
}

export function formatDateRange(start, end) {
  if (!start || !end) return "Dates TBA";

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function dateRangesOverlap(a, b) {
  if (!a?.start || !a?.end || !b?.start || !b?.end) return true;
  return a.start <= b.end && b.start <= a.end;
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function getWeekStartMonday(date) {
  const day = startOfDay(date);
  const weekday = day.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addDays(day, diff);
}

export function getDayKeyFromDate(date) {
  const keys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return keys[date.getDay()];
}

export function dateWithinRange(date, rangeStart, rangeEnd) {
  if (!rangeStart || !rangeEnd) return true;
  const day = startOfDay(date).getTime();
  return (
    day >= startOfDay(rangeStart).getTime() && day <= startOfDay(rangeEnd).getTime()
  );
}

export function getDefaultTermBounds(termKey) {
  const year = new Date().getFullYear();
  const key = normalizePlannerTerm(termKey);
  if (key === "winter") {
    return { start: new Date(year, 0, 1), end: new Date(year, 3, 30) };
  }
  if (key === "summer") {
    return { start: new Date(year, 4, 1), end: new Date(year, 7, 31) };
  }
  return { start: new Date(year, 8, 1), end: new Date(year, 11, 31) };
}

export function getPlannerBounds(courses, termKey) {
  let start = null;
  let end = null;

  for (const course of courses) {
    const range = getCourseDateRange(course);
    if (range.start && (!start || range.start < start)) start = range.start;
    if (range.end && (!end || range.end > end)) end = range.end;
  }

  if (start && end) {
    return { start: startOfDay(start), end: startOfDay(end) };
  }

  return getDefaultTermBounds(termKey);
}

export function buildWeekStarts(rangeStart, rangeEnd) {
  const weeks = [];
  let cursor = getWeekStartMonday(rangeStart);
  const end = startOfDay(rangeEnd);

  while (cursor <= end) {
    weeks.push(new Date(cursor));
    cursor = addDays(cursor, 7);
  }

  if (!weeks.length) {
    weeks.push(getWeekStartMonday(rangeStart));
  }

  return weeks;
}

export function buildWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatDayHeader(date) {
  return {
    dayLabel: date.toLocaleDateString("en-US", { weekday: "short" }),
    dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

export function formatWeekNavLabel(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear();

  const startLabel = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear && sameMonth ? {} : { year: "numeric" }),
  });
  const endLabel = weekEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function getCourseIdentity(course) {
  const crn = pickFirst(course, ["courseReferenceNumber", "crn"]);
  if (crn) return `crn:${crn}`;
  const subject = pickFirst(course, ["subjectCode", "subject", "subj", "courseCode"], "course");
  const number = pickFirst(course, ["courseNumber", "courseNbr", "courseNum", "catalogNumber"], "");
  const section = getCourseSection(course);
  return `${subject}-${number}-${section}`;
}

export function listMeetingSlots(course) {
  const slots = [];
  for (const mt of getMeetingTimes(course)) {
    const start = toMinutes(mt.beginTime);
    const end = toMinutes(mt.endTime);
    if (start == null || end == null || end <= start) continue;
    for (const day of PLANNER_DAY_KEYS) {
      if (mt?.[day]) slots.push({ day, start, end });
    }
  }
  return slots;
}

export function findPlannerConflict(existingCourses, nextCourse, termKey) {
  const nextSlots = listMeetingSlots(nextCourse);
  if (!nextSlots.length) return null;
  const nextDateRange = getCourseDateRange(nextCourse);

  for (const existing of existingCourses) {
    if (
      termKey === "summer" &&
      !dateRangesOverlap(getCourseDateRange(existing), nextDateRange)
    ) {
      continue;
    }

    const existingSlots = listMeetingSlots(existing);
    for (const a of nextSlots) {
      for (const b of existingSlots) {
        if (a.day !== b.day) continue;
        const overlaps = a.start < b.end && b.start < a.end;
        if (overlaps) return existing;
      }
    }
  }
  return null;
}
