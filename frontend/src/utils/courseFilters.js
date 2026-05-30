import { getMeetingTimes } from "./course.js";

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
