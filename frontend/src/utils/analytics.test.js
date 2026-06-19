import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the PostHog SDK so tests assert on what we send, not on the network.
// vi.hoisted lets the mock factory reference the spy safely.
const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("posthog-js", () => ({
  default: { init: vi.fn(), capture: trackMock },
}));

import { trackAddedToPlanner, trackCourseSearched } from "./analytics.js";

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
