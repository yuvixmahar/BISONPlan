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
}

export function trackCourseSearched(subject, term) {
  if (!subject || !term) return;
  posthog.capture("course_searched", { subject, term });
}

export function trackAddedToPlanner(term) {
  posthog.capture("added_to_planner", term ? { term } : {});
}
