import { describe, expect, it } from "vitest";
import {
  buildEventTooltip,
  getTimeRangeForEvents,
  layoutDayEvents,
  normalizePlannerEvents,
  DEFAULT_START_MINUTES,
  DEFAULT_END_MINUTES,
} from "./plannerSchedule.js";

// ── helpers ─────────────────────────────────────────────────────────────────

function makeEvent(id, start, end) {
  return { id, start, end };
}

function makeCourse(overrides = {}) {
  return {
    _plannerId: "test-1",
    subjectCode: "ECE",
    courseNumber: "3700",
    sequenceNumber: "A01",
    firstName: "Amine",
    lastName: "Mezghani",
    meetingsFaculty: [
      {
        meetingTime: {
          beginTime: "0830",
          endTime: "0920",
          monday: true,
          wednesday: true,
          friday: true,
          meetingTypeDescription: "Lecture",
          startDate: "01/07/2027",
          endDate: "04/12/2027",
          buildingDescription: "EITC",
          room: "E2 110",
        },
      },
    ],
    ...overrides,
  };
}

// ── getTimeRangeForEvents ────────────────────────────────────────────────────

describe("getTimeRangeForEvents", () => {
  it("returns defaults when no events", () => {
    const range = getTimeRangeForEvents([]);
    expect(range.startMinutes).toBe(DEFAULT_START_MINUTES);
    expect(range.endMinutes).toBe(DEFAULT_END_MINUTES);
  });

  it("snaps start down and end up to the nearest hour", () => {
    const events = [makeEvent("a", 9 * 60 + 30, 10 * 60 + 20)];
    const range = getTimeRangeForEvents(events);
    expect(range.startMinutes % 60).toBe(0);
    expect(range.endMinutes % 60).toBe(0);
  });

  it("covers multiple non-overlapping events", () => {
    const events = [
      makeEvent("a", 9 * 60, 10 * 60),
      makeEvent("b", 13 * 60, 14 * 60),
    ];
    const range = getTimeRangeForEvents(events);
    expect(range.startMinutes).toBeLessThanOrEqual(9 * 60);
    expect(range.endMinutes).toBeGreaterThanOrEqual(14 * 60);
  });

  it("totalMinutes equals endMinutes minus startMinutes", () => {
    const events = [makeEvent("a", 10 * 60, 11 * 60)];
    const { startMinutes, endMinutes, totalMinutes } = getTimeRangeForEvents(events);
    expect(totalMinutes).toBe(endMinutes - startMinutes);
  });

  it("never produces a zero-height range", () => {
    const events = [makeEvent("a", 10 * 60, 10 * 60 + 5)];
    const { totalMinutes } = getTimeRangeForEvents(events);
    expect(totalMinutes).toBeGreaterThan(0);
  });
});

// ── layoutDayEvents ──────────────────────────────────────────────────────────

describe("layoutDayEvents", () => {
  it("returns empty array for no events", () => {
    expect(layoutDayEvents([])).toEqual([]);
  });

  it("assigns column 0 to a single event", () => {
    const [result] = layoutDayEvents([makeEvent("a", 480, 570)]);
    expect(result.column).toBe(0);
    expect(result.totalColumns).toBe(1);
  });

  it("puts overlapping events in separate columns", () => {
    const events = [makeEvent("a", 480, 570), makeEvent("b", 510, 600)];
    const laid = layoutDayEvents(events);
    const columns = laid.map((r) => r.column);
    expect(new Set(columns).size).toBe(2);
    expect(laid[0].totalColumns).toBe(2);
  });

  it("back-to-back events share a column", () => {
    const events = [makeEvent("a", 480, 570), makeEvent("b", 570, 660)];
    const laid = layoutDayEvents(events);
    expect(laid[0].totalColumns).toBe(1);
    expect(laid[1].totalColumns).toBe(1);
  });

  it("three simultaneous events use three columns", () => {
    const events = [
      makeEvent("a", 480, 570),
      makeEvent("b", 480, 570),
      makeEvent("c", 480, 570),
    ];
    const laid = layoutDayEvents(events);
    expect(Math.max(...laid.map((r) => r.totalColumns))).toBe(3);
  });

  it("does not mutate the input array", () => {
    const events = [makeEvent("a", 480, 570), makeEvent("b", 510, 600)];
    const copy = [...events];
    layoutDayEvents(events);
    expect(events).toEqual(copy);
  });
});

// ── normalizePlannerEvents ───────────────────────────────────────────────────

describe("normalizePlannerEvents", () => {
  it("returns empty array for no courses", () => {
    expect(normalizePlannerEvents([])).toEqual([]);
  });

  it("emits one event per meeting day", () => {
    const events = normalizePlannerEvents([makeCourse()]);
    // MWF = 3 days
    expect(events).toHaveLength(3);
  });

  it("includes sectionType from meetingTypeDescription", () => {
    const events = normalizePlannerEvents([makeCourse()]);
    expect(events[0].sectionType).toBe("Lecture");
  });

  it("falls back to meetingType when description is absent", () => {
    const course = makeCourse();
    course.meetingsFaculty[0].meetingTime.meetingTypeDescription = undefined;
    course.meetingsFaculty[0].meetingTime.meetingType = "LAB";
    const events = normalizePlannerEvents([course]);
    expect(events[0].sectionType).toBe("LAB");
  });

  it("falls back to 'Class' when both type fields are absent", () => {
    const course = makeCourse();
    course.meetingsFaculty[0].meetingTime.meetingTypeDescription = undefined;
    course.meetingsFaculty[0].meetingTime.meetingType = undefined;
    const events = normalizePlannerEvents([course]);
    expect(events[0].sectionType).toBe("Class");
  });

  it("skips meetings with invalid time ranges", () => {
    const course = makeCourse();
    course.meetingsFaculty[0].meetingTime.beginTime = "1000";
    course.meetingsFaculty[0].meetingTime.endTime = "0900"; // end before start
    expect(normalizePlannerEvents([course])).toHaveLength(0);
  });

  it("produces unique ids per event", () => {
    const events = normalizePlannerEvents([makeCourse()]);
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries location through from meeting", () => {
    const events = normalizePlannerEvents([makeCourse()]);
    expect(events[0].location).toBe("EITC E2 110");
  });
});

// ── buildEventTooltip ────────────────────────────────────────────────────────

describe("buildEventTooltip", () => {
  const baseEv = {
    code: "ECE 3700",
    section: "A01",
    start: 8 * 60 + 30,
    end: 9 * 60 + 20,
    sectionType: "Lecture",
    location: "EITC E2 110",
    instructor: "Amine Mezghani",
  };

  it("includes course code and section", () => {
    expect(buildEventTooltip(baseEv)).toContain("ECE 3700 A01");
  });

  it("includes sectionType", () => {
    expect(buildEventTooltip(baseEv)).toContain("Lecture");
  });

  it("includes location", () => {
    expect(buildEventTooltip(baseEv)).toContain("EITC E2 110");
  });

  it("omits falsy fields", () => {
    const ev = { ...baseEv, instructor: "", location: null };
    const tooltip = buildEventTooltip(ev);
    expect(tooltip).not.toMatch(/null/);
    expect(tooltip).not.toMatch(/undefined/);
  });
});
