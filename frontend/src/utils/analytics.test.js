import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the PostHog SDK so tests assert on what we send, not on the network.
// vi.hoisted lets the mock factory reference the spy safely.
const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("posthog-js", () => ({
  default: { init: vi.fn(), capture: trackMock, register: vi.fn() },
}));

import { getVisitorProps, trackAddedToPlanner, trackCourseSearched } from "./analytics.js";

// Minimal in-memory localStorage so we can exercise the new-vs-returning logic
// in the node test environment, which has no real localStorage.
function makeLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

describe("analytics — trackCourseSearched", () => {
  beforeEach(() => trackMock.mockClear());

  it("fires course_searched with subject and term", () => {
    trackCourseSearched("ECE", "202710");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("course_searched", {
      subject: "ECE",
      term: "202710",
    });
  });

  it("does not fire without a subject", () => {
    trackCourseSearched("", "202710");
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("does not fire without a term", () => {
    trackCourseSearched("ECE", "");
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("does not fire when both are missing", () => {
    trackCourseSearched(undefined, undefined);
    expect(trackMock).not.toHaveBeenCalled();
  });
});

describe("analytics — trackAddedToPlanner", () => {
  beforeEach(() => trackMock.mockClear());

  it("fires added_to_planner with the term", () => {
    trackAddedToPlanner("fall");
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("added_to_planner", { term: "fall" });
  });

  it("fires with empty props when the term is missing", () => {
    trackAddedToPlanner();
    expect(trackMock).toHaveBeenCalledWith("added_to_planner", {});
  });
});

describe("analytics — getVisitorProps (retention signal)", () => {
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it("treats a first-ever visit as new and records the first-seen date", () => {
    globalThis.localStorage = makeLocalStorage();
    const props = getVisitorProps("2026-06-20");
    expect(props).toEqual({
      is_returning: false,
      days_since_first_seen: 0,
      first_seen_date: "2026-06-20",
    });
    // The date is persisted so the next visit can be recognised.
    expect(globalThis.localStorage.getItem("bp_first_seen")).toBe("2026-06-20");
  });

  it("counts a visit on a later day as returning", () => {
    globalThis.localStorage = makeLocalStorage({ bp_first_seen: "2026-06-13" });
    const props = getVisitorProps("2026-06-20");
    expect(props).toEqual({
      is_returning: true,
      days_since_first_seen: 7,
      first_seen_date: "2026-06-13",
    });
  });

  it("does not count a same-day reload as returning", () => {
    globalThis.localStorage = makeLocalStorage({ bp_first_seen: "2026-06-20" });
    const props = getVisitorProps("2026-06-20");
    expect(props.is_returning).toBe(false);
    expect(props.days_since_first_seen).toBe(0);
  });

  it("treats a fresh visit as new when localStorage is unavailable", () => {
    // No globalStorage set — typeof localStorage === "undefined".
    const props = getVisitorProps("2026-06-20");
    expect(props).toEqual({
      is_returning: false,
      days_since_first_seen: 0,
      first_seen_date: "2026-06-20",
    });
  });

  it("falls back to a fresh visit when localStorage throws", () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    };
    const props = getVisitorProps("2026-06-20");
    expect(props.is_returning).toBe(false);
    expect(props.first_seen_date).toBe("2026-06-20");
  });
});
