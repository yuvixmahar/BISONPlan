import { getCourseNumber, getMeetingTimes } from "./course.js";

// Course levels surfaced in the filter. 1xxx–4xxx are undergraduate, 7xxx is
// graduate. Aurora doesn't expose "level" as a field, so we derive it from the
// leading digit of the course number we already load for every course.
export const COURSE_LEVELS = [1, 2, 3, 4, 7];

/** Leading digit of the course number (e.g. "2150" -> 2), or null if unknown. */
export function getCourseLevel(course) {
  const match = String(getCourseNumber(course)).match(/\d/);
  return match ? Number(match[0]) : null;
}

/**
 * True when the course matches one of the selected levels. An empty selection
 * means "Any level" and matches everything.
 */
export function matchesLevels(course, selectedLevels) {
  if (!selectedLevels || selectedLevels.length === 0) return true;
  const level = getCourseLevel(course);
  return level != null && selectedLevels.includes(level);
}

const DAY_CODE_TO_KEY = {
  M: "monday",
  T: "tuesday",
  W: "wednesday",
  R: "thursday",
  F: "friday",
  S: "saturday",
  U: "sunday",
};

export function hasDay(course, dayCode) {
  if (!dayCode || dayCode === "any") return true;
  const dayKey = DAY_CODE_TO_KEY[dayCode];
  if (!dayKey) return true;
  return getMeetingTimes(course).some((mt) => Boolean(mt?.[dayKey]));
}

export function inTimeWindow(course, timeFilter) {
  if (!timeFilter || timeFilter === "any") return true;

  const beginTimes = getMeetingTimes(course)
    .map((mt) => Number(mt?.beginTime ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!beginTimes.length) return false;

  return beginTimes.some((t) => {
    if (timeFilter === "morning") return t < 1200;
    if (timeFilter === "afternoon") return t >= 1200 && t < 1700;
    if (timeFilter === "evening") return t >= 1700;
    return true;
  });
}
