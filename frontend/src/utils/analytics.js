import posthog from "posthog-js";

// PostHog powers our "used vs visited" metrics: page views give visitors, and
// the custom events below count real usage (a course actually searched, a class
// actually added). Autocapture also records click/interaction data for free,
// which gives us heatmaps without extra wiring.
//
// The project API key is public (write-only) and safe to ship in the client.
// Env vars override it so you can point at a different project without a code
// change.
const POSTHOG_KEY =
  import.meta.env.VITE_POSTHOG_KEY ?? "phc_zVxZereGfqLtPQK7QXGdDV3mzUjRJvGvBmMnuWYGtMqJ";
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Retention signal. We run `person_profiles: "identified_only"` (no login, keeps
// us on the free tier), so PostHog can't segment our events by new-vs-returning
// on its own. Instead we stamp a first-seen date in localStorage on the first
// visit and derive a `is_returning` flag from it, then attach that to every
// event as a super property. That makes "what share of searches came from
// returning students" a hard, filterable number rather than a soft reading.
const FIRST_SEEN_KEY = "bp_first_seen";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/**
 * Returns visitor-recency properties and records the first-seen date on the very
 * first visit. A visitor counts as "returning" only once they come back on a
 * later day, so same-session reloads don't inflate the number.
 */
export function getVisitorProps(now = todayIso()) {
  let firstSeen = null;
  try {
    if (typeof localStorage !== "undefined") {
      firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
      if (!firstSeen) {
        localStorage.setItem(FIRST_SEEN_KEY, now);
        firstSeen = now;
      }
    }
  } catch {
    // localStorage blocked (private mode, storage disabled) — treat as a fresh,
    // first-time visit rather than crashing analytics.
    firstSeen = now;
  }
  return {
    is_returning: Boolean(firstSeen) && firstSeen < now,
    days_since_first_seen: daysBetween(firstSeen ?? now, now),
    first_seen_date: firstSeen ?? now,
  };
}

export function initAnalytics() {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    // No login on the app, so don't create person profiles for every anonymous
    // visitor — keeps us well within the free tier while still counting events.
    person_profiles: "identified_only",
  });
  // Attach the retention signal to every event captured after init (pageviews,
  // searches, planner-adds), so any insight can be split by new vs returning.
  posthog.register(getVisitorProps());
}

export function trackCourseSearched(subject, term) {
  if (!subject || !term) return;
  posthog.capture("course_searched", { subject, term });
}

export function trackAddedToPlanner(term) {
  posthog.capture("added_to_planner", term ? { term } : {});
}
