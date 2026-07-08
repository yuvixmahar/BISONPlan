import { describe, expect, it } from "vitest";
import { buildPlannerText, plannerTextFilename } from "./plannerExport.js";

const NOW = new Date(2026, 6, 8, 14, 35); // 2026-07-08 14:35 (local)

const course = (subjectCode, courseNumber, title, crn, section) => ({
  subjectCode,
  courseNumber,
  title,
  courseReferenceNumber: crn,
  ...(section ? { sequenceNumber: section } : {}),
});

const sample = [
  course("COMP", "1010", "Introduction to Computer Science 1", "12345", "A01"),
  course("MATH", "1500", "Introduction to Calculus", "23456", "B02"),
];

describe("buildPlannerText", () => {
  it("lists each course as 'CODE SECTION - Title - CRN'", () => {
    const text = buildPlannerText("Fall", sample, { now: NOW });
    expect(text).toContain("- COMP 1010 A01 - Introduction to Computer Science 1 - CRN 12345");
    expect(text).toContain("- MATH 1500 B02 - Introduction to Calculus - CRN 23456");
  });

  it("omits the section when a course has none", () => {
    const noSection = [course("STAT", "1000", "Basic Statistics", "34567")];
    const text = buildPlannerText("Fall", noSection, { now: NOW });
    expect(text).toContain("- STAT 1000 - Basic Statistics - CRN 34567");
  });

  it("includes a quick-copy CRNs line with every CRN", () => {
    const text = buildPlannerText("Fall", sample, { now: NOW });
    expect(text).toContain("CRNs: 12345  23456");
  });

  it("has a term-labelled header and a generated date + time", () => {
    const text = buildPlannerText("Winter", sample, { now: NOW });
    expect(text).toContain("BISONplan — Winter schedule");
    expect(text).toContain("Generated 2026-07-08 14:35");
    expect(text).toContain("Courses (2)");
  });

  it("uses Windows line endings", () => {
    const text = buildPlannerText("Fall", sample, { now: NOW });
    expect(text).toContain("\r\n");
  });

  it("handles a course with no CRN and omits it from the CRNs line", () => {
    const list = [sample[0], course("STAT", "1000", "Basic Statistics", "")];
    const text = buildPlannerText("Fall", list, { now: NOW });
    expect(text).toContain("- STAT 1000 - Basic Statistics - CRN not available");
    expect(text).toContain("CRNs: 12345"); // only the course that has a CRN
    expect(text).not.toContain("23456");
  });

  it("produces a friendly message for an empty term", () => {
    const text = buildPlannerText("Summer", [], { now: NOW });
    expect(text).toContain("No courses added for this term yet.");
    expect(text).not.toContain("CRNs:");
  });
});

describe("plannerTextFilename", () => {
  it("builds a slugged filename with date and time", () => {
    expect(plannerTextFilename("Fall", { now: NOW })).toBe(
      "bisonplan-fall-schedule-2026-07-08-1435.txt"
    );
  });

  it("falls back when the label is empty", () => {
    expect(plannerTextFilename("", { now: NOW })).toBe(
      "bisonplan-planner-schedule-2026-07-08-1435.txt"
    );
  });
});
