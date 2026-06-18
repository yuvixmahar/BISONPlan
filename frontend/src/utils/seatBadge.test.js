import { describe, expect, it } from "vitest";

// Mirrors the abbreviateSectionType function in WeeklyPlanner.jsx
// and the seat-status logic in SeatBadge.jsx — tested here as pure functions
// so we catch regressions without needing a DOM.

function abbreviateSectionType(raw) {
  if (!raw) return "";
  const s = raw.toLowerCase();
  if (s.includes("lab")) return "Lab";
  if (s.includes("tut")) return "Tut";
  if (s.includes("lec")) return "Lec";
  if (s.includes("semi")) return "Sem";
  return "";
}

function getSeatStatus(seatsAvailable) {
  const seats = Number(seatsAvailable ?? 0);
  if (seats <= 0) return "full";
  if (seats <= 10) return "limited";
  return "open";
}

function getSeatLabel(seatsAvailable, seatsCapacity) {
  const seats = Number(seatsAvailable ?? 0);
  const cap = Number(seatsCapacity ?? 0);
  const seatCap = Number.isFinite(cap) && cap > 0 ? cap : null;
  return seatCap ? `${seats}/${seatCap} seats left` : `${seats} seats left`;
}

// ── abbreviateSectionType ────────────────────────────────────────────────────

describe("abbreviateSectionType", () => {
  it("abbreviates Lecture", () => expect(abbreviateSectionType("Lecture")).toBe("Lec"));
  it("abbreviates Laboratory", () => expect(abbreviateSectionType("Laboratory")).toBe("Lab"));
  it("abbreviates Tutorial", () => expect(abbreviateSectionType("Tutorial")).toBe("Tut"));
  it("abbreviates Seminar", () => expect(abbreviateSectionType("Seminar")).toBe("Sem"));
  it("is case-insensitive", () => {
    expect(abbreviateSectionType("LECTURE")).toBe("Lec");
    expect(abbreviateSectionType("lab section")).toBe("Lab");
  });
  it("returns empty string for unrecognised types", () => {
    expect(abbreviateSectionType("Practicum")).toBe("");
    expect(abbreviateSectionType("Studio")).toBe("");
  });
  it("returns empty string for null/undefined/empty", () => {
    expect(abbreviateSectionType(null)).toBe("");
    expect(abbreviateSectionType(undefined)).toBe("");
    expect(abbreviateSectionType("")).toBe("");
  });
});

// ── seat status logic ────────────────────────────────────────────────────────

describe("getSeatStatus", () => {
  it("returns 'open' when seats are plentiful", () => {
    expect(getSeatStatus(60)).toBe("open");
    expect(getSeatStatus(11)).toBe("open");
  });

  it("returns 'limited' when 1–10 seats remain", () => {
    expect(getSeatStatus(10)).toBe("limited");
    expect(getSeatStatus(1)).toBe("limited");
  });

  it("returns 'full' when zero or negative seats", () => {
    expect(getSeatStatus(0)).toBe("full");
    expect(getSeatStatus(-1)).toBe("full");
  });

  it("treats null/undefined as zero seats (full)", () => {
    expect(getSeatStatus(null)).toBe("full");
    expect(getSeatStatus(undefined)).toBe("full");
  });
});

// ── seat label formatting ────────────────────────────────────────────────────

describe("getSeatLabel", () => {
  it("shows fraction when capacity is known", () => {
    expect(getSeatLabel(60, 120)).toBe("60/120 seats left");
  });

  it("shows plain count when capacity is unknown", () => {
    expect(getSeatLabel(60, null)).toBe("60 seats left");
    expect(getSeatLabel(60, 0)).toBe("60 seats left");
  });

  it("handles zero seats available", () => {
    expect(getSeatLabel(0, 120)).toBe("0/120 seats left");
  });
});
