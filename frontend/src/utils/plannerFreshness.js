import { getCourseCrn, getMeetingTimes, pickFirst, PLANNER_DAY_KEYS } from "./course.js";

// Change types surfaced to the user (see the three enabled triggers).
export const CHANGE_REMOVED = "removed";
export const CHANGE_TIME = "time";
export const CHANGE_FULL = "full";

/**
 * Aurora term code for a planned course. Stamped as `_plannerTermCode` when the
 * course is added; falls back to the raw `term` field for courses saved before
 * that stamping existed. Empty string means we can't verify it.
 */
export function getCourseTermCode(course) {
  return pickFirst(course, ["_plannerTermCode", "term"], "") || "";
}

export function getCourseSubjectCode(course) {
  return pickFirst(course, ["subjectCode", "subject", "subj"], "") || "";
}

/** Sorted meeting slots as "days|begin-end", used to detect timing changes. */
export function meetingSlots(course) {
  const slots = [];
  for (const mt of getMeetingTimes(course)) {
    const days = PLANNER_DAY_KEYS.filter((d) => mt?.[d]).join("");
    const begin = String(mt?.beginTime ?? "").trim();
    const end = String(mt?.endTime ?? "").trim();
    if (!days && !begin && !end) continue;
    slots.push(`${days}|${begin}-${end}`);
  }
  return slots.sort();
}

export function meetingSignature(course) {
  return meetingSlots(course).join(",");
}

/** True when the section still has seats available. */
export function isSectionOpen(course) {
  const raw = pickFirst(course, ["seatsAvailable", "seats_avail", "seats"], "");
  if (raw === "") return false;
  const seats = Number(raw);
  return Number.isFinite(seats) && seats > 0;
}

/**
 * Compares a planned (stored) course against its fresh backend counterpart and
 * returns the list of meaningful changes. `fresh` is null when the CRN is no
 * longer offered in that subject+term.
 *
 * Only the three enabled triggers are reported: removed, timing change, and
 * open→full. Seat-count jitter that doesn't flip open↔full is intentionally
 * ignored to avoid noise during registration.
 */
export function diffPlannedCourse(stored, fresh) {
  if (!fresh) return [{ type: CHANGE_REMOVED }];

  const changes = [];

  const storedSig = meetingSignature(stored);
  const freshSig = meetingSignature(fresh);
  if (storedSig !== freshSig) {
    changes.push({ type: CHANGE_TIME, from: storedSig, to: freshSig });
  }

  if (isSectionOpen(stored) && !isSectionOpen(fresh)) {
    changes.push({ type: CHANGE_FULL });
  }

  return changes;
}

/**
 * Builds per-course verification results from the planned courses and a lookup
 * of fresh data keyed by "subject|termCode" → { byCrn: Map, ok: boolean }.
 * Returns a map of _plannerId → { status, changes, fresh, termKey, course }.
 * status is "changed" | "ok" | "unverifiable".
 */
export function computePlannerResults(planned, freshBySubjectTerm) {
  const results = {};

  for (const { termKey, course } of planned) {
    const id = course?._plannerId;
    if (!id) continue;

    const subject = getCourseSubjectCode(course);
    const term = getCourseTermCode(course);
    const crn = getCourseCrn(course);
    const group = subject && term ? freshBySubjectTerm.get(`${subject}|${term}`) : null;

    if (!subject || !term || !crn || !group || !group.ok) {
      results[id] = { status: "unverifiable", changes: [], fresh: null, termKey, course };
      continue;
    }

    const fresh = group.byCrn.get(String(crn)) || null;
    const changes = diffPlannedCourse(course, fresh);
    results[id] = {
      status: changes.length ? "changed" : "ok",
      changes,
      fresh,
      termKey,
      course,
    };
  }

  return results;
}

/** Stable signature of the current issue set, used to avoid re-alerting the same acknowledged changes. */
export function issuesSignature(issues) {
  return issues
    .map((i) => `${i.id}:${i.changes.map((c) => c.type).sort().join("+")}`)
    .sort()
    .join(";");
}
