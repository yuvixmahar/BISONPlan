import { describe, expect, it } from "vitest";
import {
  CHANGE_FULL,
  CHANGE_REMOVED,
  CHANGE_TIME,
  computePlannerResults,
  diffPlannedCourse,
  getCourseSubjectCode,
  getCourseTermCode,
  isSectionOpen,
  issuesSignature,
  meetingSignature,
} from "./plannerFreshness.js";

function course({ crn = "12345", seats = 10, days = { monday: true, wednesday: true, friday: true }, begin = "1030", end = "1145", termCode, term } = {}) {
  return {
    subjectCode: "COMP",
    courseNumber: "1010",
    courseReferenceNumber: crn,
    seatsAvailable: seats,
    ...(termCode ? { _plannerTermCode: termCode } : {}),
    ...(term ? { term } : {}),
    meetingsFaculty: [{ meetingTime: { ...days, beginTime: begin, endTime: end } }],
  };
}

// ── identity helpers ─────────────────────────────────────────────────────────

describe("getCourseTermCode / getCourseSubjectCode", () => {
  it("prefers the stamped planner term code", () => {
    expect(getCourseTermCode(course({ termCode: "202590", term: "999999" }))).toBe("202590");
  });
  it("falls back to the raw Aurora term field", () => {
    expect(getCourseTermCode(course({ term: "202590" }))).toBe("202590");
  });
  it("returns empty string when neither is present", () => {
    expect(getCourseTermCode(course())).toBe("");
  });
  it("reads the subject code", () => {
    expect(getCourseSubjectCode(course())).toBe("COMP");
  });
});

// ── signatures ───────────────────────────────────────────────────────────────

describe("meetingSignature", () => {
  it("is stable regardless of meeting order", () => {
    const a = {
      meetingsFaculty: [
        { meetingTime: { monday: true, beginTime: "0900", endTime: "1000" } },
        { meetingTime: { friday: true, beginTime: "1300", endTime: "1400" } },
      ],
    };
    const b = {
      meetingsFaculty: [
        { meetingTime: { friday: true, beginTime: "1300", endTime: "1400" } },
        { meetingTime: { monday: true, beginTime: "0900", endTime: "1000" } },
      ],
    };
    expect(meetingSignature(a)).toBe(meetingSignature(b));
  });
});

describe("isSectionOpen", () => {
  it("is open with seats > 0", () => expect(isSectionOpen(course({ seats: 3 }))).toBe(true));
  it("is closed at zero seats", () => expect(isSectionOpen(course({ seats: 0 }))).toBe(false));
  it("is closed when seats are missing", () => expect(isSectionOpen({})).toBe(false));
});

// ── diffPlannedCourse ────────────────────────────────────────────────────────

describe("diffPlannedCourse", () => {
  it("flags removal when there is no fresh match", () => {
    expect(diffPlannedCourse(course(), null)).toEqual([{ type: CHANGE_REMOVED }]);
  });

  it("reports no changes for identical data", () => {
    expect(diffPlannedCourse(course(), course())).toEqual([]);
  });

  it("detects a meeting time change", () => {
    const changes = diffPlannedCourse(course(), course({ begin: "1300", end: "1415" }));
    expect(changes.map((c) => c.type)).toEqual([CHANGE_TIME]);
  });

  it("detects a day change", () => {
    const changes = diffPlannedCourse(
      course(),
      course({ days: { tuesday: true, thursday: true } })
    );
    expect(changes.map((c) => c.type)).toContain(CHANGE_TIME);
  });

  it("detects open → full", () => {
    const changes = diffPlannedCourse(course({ seats: 5 }), course({ seats: 0 }));
    expect(changes.map((c) => c.type)).toEqual([CHANGE_FULL]);
  });

  it("ignores seat jitter that stays open", () => {
    expect(diffPlannedCourse(course({ seats: 10 }), course({ seats: 2 }))).toEqual([]);
  });

  it("can report both a time change and going full", () => {
    const changes = diffPlannedCourse(
      course({ seats: 5 }),
      course({ seats: 0, begin: "0800", end: "0915" })
    );
    expect(changes.map((c) => c.type).sort()).toEqual([CHANGE_FULL, CHANGE_TIME].sort());
  });
});

// ── computePlannerResults ────────────────────────────────────────────────────

describe("computePlannerResults", () => {
  const planned = [
    { termKey: "fall", course: { ...course({ crn: "111" }), _plannerId: "p1", _plannerTermCode: "202590" } },
    { termKey: "fall", course: { ...course({ crn: "222" }), _plannerId: "p2", _plannerTermCode: "202590" } },
  ];

  it("marks changed, ok, and removed courses", () => {
    const fresh = new Map([
      [
        "COMP|202590",
        {
          ok: true,
          byCrn: new Map([
            ["111", course({ crn: "111", begin: "1300", end: "1415" })], // time changed
            // 222 missing → removed
          ]),
        },
      ],
    ]);
    const results = computePlannerResults(planned, fresh);
    expect(results.p1.status).toBe("changed");
    expect(results.p1.changes.map((c) => c.type)).toEqual([CHANGE_TIME]);
    expect(results.p2.status).toBe("changed");
    expect(results.p2.changes).toEqual([{ type: CHANGE_REMOVED }]);
  });

  it("marks courses unverifiable when the fetch failed", () => {
    const fresh = new Map([["COMP|202590", { ok: false, byCrn: new Map() }]]);
    const results = computePlannerResults(planned, fresh);
    expect(results.p1.status).toBe("unverifiable");
    expect(results.p2.status).toBe("unverifiable");
  });

  it("marks unverifiable when the term code is unknown", () => {
    const noTerm = [{ termKey: "fall", course: { ...course({ crn: "111" }), _plannerId: "p9" } }];
    const results = computePlannerResults(noTerm, new Map());
    expect(results.p9.status).toBe("unverifiable");
  });
});

// ── issuesSignature ──────────────────────────────────────────────────────────

describe("issuesSignature", () => {
  it("is order-independent and reflects change types", () => {
    const a = [
      { id: "p1", changes: [{ type: CHANGE_TIME }] },
      { id: "p2", changes: [{ type: CHANGE_REMOVED }] },
    ];
    const b = [
      { id: "p2", changes: [{ type: CHANGE_REMOVED }] },
      { id: "p1", changes: [{ type: CHANGE_TIME }] },
    ];
    expect(issuesSignature(a)).toBe(issuesSignature(b));
  });

  it("changes when a new issue appears", () => {
    const before = [{ id: "p1", changes: [{ type: CHANGE_TIME }] }];
    const after = [
      { id: "p1", changes: [{ type: CHANGE_TIME }] },
      { id: "p2", changes: [{ type: CHANGE_FULL }] },
    ];
    expect(issuesSignature(before)).not.toBe(issuesSignature(after));
  });
});
