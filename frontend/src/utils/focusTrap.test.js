// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { getFocusableElements, handleFocusTrap } from "./focusTrap.js";

function mountFocusTrapFixture() {
  document.body.innerHTML = `
    <div id="trap">
      <button type="button" id="first">First</button>
      <button type="button" id="last">Last</button>
    </div>
  `;
  return document.getElementById("trap");
}

describe("focusTrap", () => {
  beforeAll(() => {
    HTMLElement.prototype.getClientRects = function getClientRects() {
      return [{ width: 1, height: 1 }];
    };
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns focusable elements inside the container", () => {
    const container = mountFocusTrapFixture();

    expect(getFocusableElements(container).map((el) => el.id)).toEqual(["first", "last"]);
  });

  it("wraps focus from last to first on Tab", () => {
    const container = mountFocusTrapFixture();
    const first = document.getElementById("first");
    const last = document.getElementById("last");
    last.focus();

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    const handled = handleFocusTrap(event, container);

    expect(handled).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("wraps focus from first to last on Shift+Tab", () => {
    const container = mountFocusTrapFixture();
    const first = document.getElementById("first");
    const last = document.getElementById("last");
    first.focus();

    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    const handled = handleFocusTrap(event, container);

    expect(handled).toBe(true);
    expect(document.activeElement).toBe(last);
  });
});
