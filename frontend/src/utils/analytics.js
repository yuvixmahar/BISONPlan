import { track } from "@vercel/analytics";

// Thin, guarded wrappers around Vercel Analytics custom events. These let us
// count *real usage* (a course actually searched, a class actually added to the
// planner) on top of the plain page views Analytics already records — i.e.
// "used" vs "just visited". The underlying track() is a safe no-op when the
// Analytics script isn't loaded (local dev / preview), so callers don't guard.

export function trackCourseSearched(subject, term) {
  if (!subject || !term) return;
  track("course_searched", { subject, term });
}

export function trackAddedToPlanner(term) {
  track("added_to_planner", term ? { term } : {});
}
