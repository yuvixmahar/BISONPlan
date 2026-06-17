import { describe, expect, it } from "vitest";
import { getApiErrorMessage } from "./apiError.js";

describe("getApiErrorMessage", () => {
  it("prefers FastAPI string detail", () => {
    const error = { response: { data: { detail: "Aurora is unreachable (error while fetching terms): TimeoutException" } } };
    expect(getApiErrorMessage(error, "fallback")).toContain("Aurora is unreachable");
  });

  it("reads validation error arrays", () => {
    const error = { response: { data: { detail: [{ msg: "field required" }] } } };
    expect(getApiErrorMessage(error, "fallback")).toBe("field required");
  });

  it("falls back when response detail is missing", () => {
    expect(getApiErrorMessage({ message: "Network Error" }, "fallback")).toBe("Network Error");
    expect(getApiErrorMessage({}, "fallback")).toBe("fallback");
  });

  it("ignores blank detail strings", () => {
    expect(getApiErrorMessage({ response: { data: { detail: "   " } } }, "fallback")).toBe("fallback");
  });
});
