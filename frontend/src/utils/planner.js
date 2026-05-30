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

export function plannerTermFromTermDescription(description = "") {
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
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  let start = null;
  let end = null;

  for (const entry of mf) {
    const mt = entry?.meetingTime;
    if (!mt) continue;
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

export function formatMonthSpan(start, end) {
  if (!start || !end) return "Unknown dates";

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  if (startMonth === endMonth) return startMonth;
  return `${startMonth} – ${endMonth}`;
}

export function dateRangeKey(start, end) {
  if (!start || !end) return "unknown";
  const fmt = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${fmt(start)}_${fmt(end)}`;
}

export function dateRangesOverlap(a, b) {
  if (!a?.start || !a?.end || !b?.start || !b?.end) return true;
  return a.start <= b.end && b.start <= a.end;
}

export function groupCoursesByDateRange(courses) {
  const groups = new Map();

  for (const course of courses) {
    const range = getCourseDateRange(course);
    const key = dateRangeKey(range.start, range.end);
    if (!groups.has(key)) {
      groups.set(key, { key, range, courses: [] });
    }
    groups.get(key).courses.push(course);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (!a.range.start || !b.range.start) return 1;
    if (!b.range.start) return -1;
    return a.range.start - b.range.start;
  });
}

export function getSummerTimelineBounds(courses) {
  const year =
    courses
      .map((course) => getCourseDateRange(course).start?.getFullYear())
      .find(Boolean) ?? new Date().getFullYear();

  return {
    year,
    start: new Date(year, 4, 1),
    end: new Date(year, 8, 1),
  };
}

export function getTimelinePosition(date, timelineStart, timelineEnd) {
  const spanMs = timelineEnd.getTime() - timelineStart.getTime();
  if (spanMs <= 0) return 0;
  return ((date.getTime() - timelineStart.getTime()) / spanMs) * 100;
}
