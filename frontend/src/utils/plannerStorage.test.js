import { beforeEach, describe, expect, it } from "vitest";
import {
  MAX_COURSES_PER_TERM,
  STORAGE_KEY,
  emptyPlannerState,
  loadPlannerState,
  sanitizePlannerByTerm,
  sanitizePlannerIdSeed,
  savePlannerState,
} from "./plannerStorage.js";

function createMemoryStorage() {
  let store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe("plannerStorage", () => {
  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("returns empty state when storage is missing", () => {
    expect(loadPlannerState(null)).toEqual(emptyPlannerState());
  });

  it("round-trips valid planner state", () => {
    const state = {
      plannerByTerm: {
        fall: [{ _plannerId: "fall-1", courseCode: "COMP 1010", subjectCode: "COMP" }],
        winter: [],
        summer: [],
      },
      plannerIdSeed: 4,
    };
    savePlannerState(state.plannerByTerm, state.plannerIdSeed, storage);
    expect(loadPlannerState(storage)).toEqual({
      plannerByTerm: state.plannerByTerm,
      plannerIdSeed: 4,
    });
  });

  it("survives refresh by reading persisted JSON", () => {
    const course = { _plannerId: "fall-99", courseReferenceNumber: "12345" };
    savePlannerState({ fall: [course], winter: [], summer: [] }, 100, storage);
    const reloaded = loadPlannerState(storage);
    expect(reloaded.plannerByTerm.fall).toHaveLength(1);
    expect(reloaded.plannerByTerm.fall[0].courseReferenceNumber).toBe("12345");
  });

  it("rejects invalid JSON without throwing", () => {
    storage.setItem(STORAGE_KEY, "{not-json");
    expect(loadPlannerState(storage)).toEqual(emptyPlannerState());
  });

  it("rejects non-object root payloads", () => {
    storage.setItem(STORAGE_KEY, JSON.stringify(["evil"]));
    expect(loadPlannerState(storage)).toEqual(emptyPlannerState());
  });

  it("blocks prototype pollution keys", () => {
    const polluted = sanitizePlannerByTerm({
      fall: [{ _plannerId: "x", __proto__: { polluted: true }, courseCode: "COMP 1010" }],
      winter: [],
      summer: [],
    });
    expect(polluted.fall[0]).not.toHaveProperty("__proto__");
    expect(Object.prototype.polluted).toBeUndefined();
  });

  it("drops courses without planner ids", () => {
    const sanitized = sanitizePlannerByTerm({
      fall: [{ courseCode: "COMP 1010" }, { _plannerId: "", courseCode: "MATH 1200" }],
      winter: [],
      summer: [],
    });
    expect(sanitized.fall).toEqual([]);
  });

  it("caps courses per term to prevent storage abuse", () => {
    const many = Array.from({ length: 80 }, (_, index) => ({
      _plannerId: `fall-${index}`,
      courseCode: `COURSE ${index}`,
    }));
    const sanitized = sanitizePlannerByTerm({ fall: many, winter: [], summer: [] });
    expect(sanitized.fall).toHaveLength(MAX_COURSES_PER_TERM);
  });

  it("ignores unknown term buckets", () => {
    const sanitized = sanitizePlannerByTerm({
      fall: [{ _plannerId: "fall-1", courseCode: "COMP 1010" }],
      evilTerm: [{ _plannerId: "evil-1", courseCode: "HACK 0001" }],
    });
    expect(sanitized.evilTerm).toBeUndefined();
    expect(sanitized.fall).toHaveLength(1);
  });

  it("clamps invalid planner id seeds", () => {
    expect(sanitizePlannerIdSeed(-5)).toBe(1);
    expect(sanitizePlannerIdSeed(1.5)).toBe(1);
    expect(sanitizePlannerIdSeed(2_000_000_000)).toBe(1_000_000_000);
  });

  it("returns false when storage quota is exceeded", () => {
    const quotaStorage = {
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    expect(
      savePlannerState({ fall: [], winter: [], summer: [] }, 1, quotaStorage)
    ).toBe(false);
  });

  it("strips function values from stored courses", () => {
    const sanitized = sanitizePlannerByTerm({
      fall: [{ _plannerId: "fall-1", courseCode: "COMP 1010", hack: () => "x" }],
      winter: [],
      summer: [],
    });
    expect(sanitized.fall[0]).not.toHaveProperty("hack");
  });
});
