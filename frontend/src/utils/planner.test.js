import { describe, expect, it } from "vitest";
import {
  normalizePlannerTerm,
  parseCourseDate,
  plannerTermFromTermDescription,
  getCourseDateRange,
  formatDateRange,
} from "./planner.js";

// ── normalizePlannerTerm ─────────────────────────────────────────────────────

describe("normalizePlannerTerm", () => {
  it("passes winter through", () => expect(normalizePlannerTerm("winter")).toBe("winter"));
  it("passes summer through", () => expect(normalizePlannerTerm("summer")).toBe("summer"));
  it("defaults anything else to fall", () => {
    expect(normalizePlannerTerm("fall")).toBe("fall");
    expect(normalizePlannerTerm("unknown")).toBe("fall");
    expect(normalizePlannerTerm("")).toBe("fall");
  });
});

// ── plannerTermFromTermDescription ───────────────────────────────────────────

describe("plannerTermFromTermDescription", () => {
  it("detects winter from term code ending in 10", () => {
    expect(plannerTermFromTermDescription("Winter 2027", "202710")).toBe("winter");
  });

  it("detects summer from term code ending in 50", () => {
    expect(plannerTermFromTermDescription("Summer 2027", "202750")).toBe("summer");
  });

  it("detects fall from term code ending in 90", () => {
    expect(plannerTermFromTermDescription("Fall 2027", "202790")).toBe("fall");
  });

  it("falls back to description when code is ambiguous", () => {
    expect(plannerTermFromTermDescription("Winter Term 2027", "")).toBe("winter");
    expect(plannerTermFromTermDescription("Summer Session", "")).toBe("summer");
    expect(plannerTermFromTermDescription("Fall Semester", "")).toBe("fall");
  });

  it("defaults to fall when nothing matches", () => {
    expect(plannerTermFromTermDescription("", "")).toBe("fall");
    expect(plannerTermFromTermDescription("Intersession", "99999")).toBe("fall");
  });

  it("term code takes priority over description", () => {
    // code says summer (50), description says winter — code wins
    expect(plannerTermFromTermDescription("Winter 2027", "202750")).toBe("summer");
  });
});

// ── parseCourseDate ──────────────────────────────────────────────────────────

describe("parseCourseDate", () => {
  it("parses MM/DD/YYYY format", () => {
    const d = parseCourseDate("01/07/2027");
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(7);
  });

  it("parses ISO YYYY-MM-DD format", () => {
    const d = parseCourseDate("2027-04-12");
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(3); // April
  });

  it("returns null for null/undefined/empty", () => {
    expect(parseCourseDate(null)).toBeNull();
    expect(parseCourseDate(undefined)).toBeNull();
    expect(parseCourseDate("")).toBeNull();
  });

  it("returns null for garbage strings", () => {
    expect(parseCourseDate("not-a-date")).toBeNull();
  });

  it("passes through a valid Date object unchanged", () => {
    const d = new Date(2027, 0, 7);
    expect(parseCourseDate(d)).toBe(d);
  });

  it("returns null for an invalid Date object", () => {
    expect(parseCourseDate(new Date("invalid"))).toBeNull();
  });
});

// ── getCourseDateRange ───────────────────────────────────────────────────────

describe("getCourseDateRange", () => {
  const courseWithMeetings = {
    meetingsFaculty: [
      {
        meetingTime: {
          startDate: "01/07/2027",
          endDate: "04/12/2027",
          beginTime: "0830",
          endTime: "0920",
          monday: true,
        },
      },
      {
        meetingTime: {
          startDate: "01/19/2027",
          endDate: "03/23/2027",
          beginTime: "1030",
          endTime: "1120",
          tuesday: true,
        },
      },
    ],
  };

  it("returns the widest start and end across all meetings", () => {
    const { start, end } = getCourseDateRange(courseWithMeetings);
    expect(start.getMonth()).toBe(0); // January (earliest)
    expect(start.getDate()).toBe(7);
    expect(end.getMonth()).toBe(3); // April (latest)
    expect(end.getDate()).toBe(12);
  });

  it("returns null start and end for a course with no meetings", () => {
    const { start, end } = getCourseDateRange({ meetingsFaculty: [] });
    expect(start).toBeNull();
    expect(end).toBeNull();
  });

  it("handles courses without meetingsFaculty gracefully", () => {
    const { start, end } = getCourseDateRange({});
    expect(start).toBeNull();
    expect(end).toBeNull();
  });
});

// ── formatDateRange ──────────────────────────────────────────────────────────

describe("formatDateRange", () => {
  it("formats a date range as a readable string", () => {
    const start = new Date(2027, 0, 7);
    const end = new Date(2027, 3, 12);
    const label = formatDateRange(start, end);
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });
});
