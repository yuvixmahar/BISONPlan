import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEAT_CACHE_TTL_SECONDS,
  formatSeatRefreshCountdown,
  getSeatRefreshSecondsRemaining,
} from "./seatRefresh.js";

describe("seatRefresh", () => {
  it("uses a ten-minute default cache ttl", () => {
    expect(DEFAULT_SEAT_CACHE_TTL_SECONDS).toBe(600);
  });

  it("counts down seconds until the cache expires", () => {
    const cachedAt = 1_700_000_000;
    const nowMs = (cachedAt + 120) * 1000;

    expect(getSeatRefreshSecondsRemaining(cachedAt, 600, nowMs)).toBe(480);
  });

  it("never returns negative remaining time", () => {
    const cachedAt = 1_700_000_000;
    const nowMs = (cachedAt + 900) * 1000;

    expect(getSeatRefreshSecondsRemaining(cachedAt, 600, nowMs)).toBe(0);
  });

  it("formats countdown as m:ss", () => {
    expect(formatSeatRefreshCountdown(125)).toBe("2:05");
    expect(formatSeatRefreshCountdown(5)).toBe("0:05");
  });

  it("returns null when cache metadata is missing", () => {
    expect(getSeatRefreshSecondsRemaining(null, 600)).toBeNull();
    expect(getSeatRefreshSecondsRemaining(1_700_000_000, null)).toBeNull();
  });
});
