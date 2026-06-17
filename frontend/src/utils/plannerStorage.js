const STORAGE_KEY = "bisonplan.planner.v1";
const STORAGE_VERSION = 1;
const PLANNER_TERM_KEYS = ["fall", "winter", "summer"];
const MAX_COURSES_PER_TERM = 50;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function emptyPlannerState() {
  return {
    plannerByTerm: { fall: [], winter: [], summer: [] },
    plannerIdSeed: 1,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeCourse(course) {
  if (!isPlainObject(course)) return null;
  if (typeof course._plannerId !== "string" || !course._plannerId.trim()) return null;

  const sanitized = {};
  for (const [key, value] of Object.entries(course)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (typeof value === "function") continue;
    sanitized[key] = value;
  }
  return sanitized;
}

export function sanitizePlannerByTerm(raw) {
  const result = emptyPlannerState().plannerByTerm;
  if (!isPlainObject(raw)) return result;

  for (const term of PLANNER_TERM_KEYS) {
    const list = raw[term];
    if (!Array.isArray(list)) continue;

    const courses = [];
    for (const item of list) {
      if (courses.length >= MAX_COURSES_PER_TERM) break;
      const sanitized = sanitizeCourse(item);
      if (sanitized) courses.push(sanitized);
    }
    result[term] = courses;
  }

  return result;
}

export function sanitizePlannerIdSeed(raw) {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) return 1;
  return Math.min(raw, 1_000_000_000);
}

export function loadPlannerState(storage = globalThis.localStorage) {
  if (!storage?.getItem) return emptyPlannerState();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyPlannerState();

    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return emptyPlannerState();

    return {
      plannerByTerm: sanitizePlannerByTerm(parsed.plannerByTerm),
      plannerIdSeed: sanitizePlannerIdSeed(parsed.plannerIdSeed),
    };
  } catch {
    return emptyPlannerState();
  }
}

export function savePlannerState(plannerByTerm, plannerIdSeed, storage = globalThis.localStorage) {
  if (!storage?.setItem) return false;

  try {
    const payload = JSON.stringify({
      version: STORAGE_VERSION,
      plannerByTerm: sanitizePlannerByTerm(plannerByTerm),
      plannerIdSeed: sanitizePlannerIdSeed(plannerIdSeed),
    });
    storage.setItem(STORAGE_KEY, payload);
    return true;
  } catch {
    return false;
  }
}

export { STORAGE_KEY, MAX_COURSES_PER_TERM };
