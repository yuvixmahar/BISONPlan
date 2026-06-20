import { describe, expect, it } from "vitest";
import { COURSE_LEVELS, getCourseLevel, matchesLevels } from "./courseFilters.js";

const course = (courseNumber) => ({ subjectCode: "COMP", courseNumber });

// ── getCourseLevel ───────────────────────────────────────────────────────────

describe("getCourseLevel", () => {
  it("reads the leading digit of the course number", () => {
    expect(getCourseLevel(course("1010"))).toBe(1);
    expect(getCourseLevel(course("2150"))).toBe(2);
    expect(getCourseLevel(course("3490"))).toBe(3);
    expect(getCourseLevel(course("4990"))).toBe(4);
    expect(getCourseLevel(course("7120"))).toBe(7);
  });

  it("accepts numeric course numbers", () => {
    expect(getCourseLevel(course(2150))).toBe(2);
  });

  it("returns null when there is no course number", () => {
    expect(getCourseLevel(course(""))).toBeNull();
    expect(getCourseLevel({})).toBeNull();
    expect(getCourseLevel(null)).toBeNull();
  });
});

// ── matchesLevels ────────────────────────────────────────────────────────────

describe("matchesLevels", () => {
  it("matches everything when no levels are selected", () => {
    expect(matchesLevels(course("1010"), [])).toBe(true);
    expect(matchesLevels(course("7120"), undefined)).toBe(true);
  });

  it("keeps courses whose level is selected", () => {
    expect(matchesLevels(course("2150"), [2, 4])).toBe(true);
    expect(matchesLevels(course("4990"), [2, 4])).toBe(true);
  });

  it("drops courses whose level is not selected", () => {
    expect(matchesLevels(course("1010"), [2, 4])).toBe(false);
    expect(matchesLevels(course("7120"), [1, 2, 3, 4])).toBe(false);
  });

  it("drops courses with an unknown level when a filter is active", () => {
    expect(matchesLevels(course(""), [3])).toBe(false);
  });
});

// ── exported option list ─────────────────────────────────────────────────────

describe("COURSE_LEVELS", () => {
  it("lists undergrad 1xxx–4xxx and grad 7xxx", () => {
    expect(COURSE_LEVELS).toEqual([1, 2, 3, 4, 7]);
  });
});
