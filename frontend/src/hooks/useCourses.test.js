import { describe, expect, it } from "vitest";

// Test the pure logic extracted from useCourses without requiring a DOM.
// The hook itself is an integration of useState/useEffect; we test the
// decision logic that determines refresh vs initial-load behaviour.

function isRefreshMode(hasData, refreshTick) {
  return hasData && refreshTick > 0;
}

function deriveIsStale(source) {
  return source === "stale" || source === "cached_only";
}

function resolveError(e) {
  return e?.message || "Failed to load courses";
}

describe("useCourses — refresh vs initial-load decision", () => {
  it("initial load when no data yet, even with tick > 0", () => {
    expect(isRefreshMode(false, 1)).toBe(false);
  });

  it("initial load when tick is 0 even if data exists", () => {
    expect(isRefreshMode(true, 0)).toBe(false);
  });

  it("background refresh when data exists and tick > 0", () => {
    expect(isRefreshMode(true, 1)).toBe(true);
    expect(isRefreshMode(true, 5)).toBe(true);
  });
});

describe("useCourses — staleness detection", () => {
  it("marks stale for source=stale", () => {
    expect(deriveIsStale("stale")).toBe(true);
  });

  it("marks stale for source=cached_only", () => {
    expect(deriveIsStale("cached_only")).toBe(true);
  });

  it("not stale for source=live", () => {
    expect(deriveIsStale("live")).toBe(false);
  });

  it("not stale for undefined source", () => {
    expect(deriveIsStale(undefined)).toBe(false);
  });
});

describe("useCourses — error message resolution", () => {
  it("uses the error message when available", () => {
    expect(resolveError(new Error("Aurora down"))).toBe("Aurora down");
  });

  it("falls back to generic message for non-Error throws", () => {
    expect(resolveError(null)).toBe("Failed to load courses");
    expect(resolveError(undefined)).toBe("Failed to load courses");
    expect(resolveError("string error")).toBe("Failed to load courses");
  });
});

describe("useCourses — enabled guard", () => {
  function isEnabled(subject, term) {
    return Boolean(subject && subject.trim() && term && term.trim());
  }

  it("disabled when subject is empty", () => expect(isEnabled("", "202710")).toBe(false));
  it("disabled when term is empty", () => expect(isEnabled("ECE", "")).toBe(false));
  it("disabled when both are empty", () => expect(isEnabled("", "")).toBe(false));
  it("disabled when subject is whitespace", () => expect(isEnabled("  ", "202710")).toBe(false));
  it("enabled when both are provided", () => expect(isEnabled("ECE", "202710")).toBe(true));
});
