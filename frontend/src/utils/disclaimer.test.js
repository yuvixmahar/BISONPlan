import { beforeEach, describe, expect, it } from "vitest";
import {
  DISCLAIMER_SECTIONS,
  acceptDisclaimer,
  hasAcceptedDisclaimer,
} from "./disclaimer.js";

function createMemoryStorage() {
  let store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
}

describe("disclaimer", () => {
  let storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("requires acceptance before use", () => {
    expect(hasAcceptedDisclaimer(storage)).toBe(false);
    acceptDisclaimer(storage);
    expect(hasAcceptedDisclaimer(storage)).toBe(true);
  });

  it("includes liability language without exposing contact email", () => {
    const combined = DISCLAIMER_SECTIONS.map((section) => `${section.title} ${section.body}`).join(" ");
    expect(combined).not.toContain("@");
    expect(combined).toContain("not affiliated");
    expect(combined).toContain("Aurora");
    expect(combined).toContain("not responsible");
  });
});
