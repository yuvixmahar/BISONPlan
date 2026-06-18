import { test, expect } from "@playwright/test";
import { installMockApi } from "./fixtures/mockApi.js";
import { mockTerms } from "./fixtures/courses.js";

async function openApp(page) {
  await page.addInitScript(() => {
    localStorage.clear();
  });
  await installMockApi(page);
  await page.goto("/");
}

async function acceptDisclaimer(page) {
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "I understand — continue to BISONplan" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
}

async function selectFallTerm(page) {
  await page.getByRole("button", { name: "Select a term" }).click();
  await page.getByRole("button", { name: mockTerms[0].description, exact: true }).click();
}

async function selectCompSubject(page) {
  const subjectInput = page.getByPlaceholder("Type subject code or name...");
  await subjectInput.click();
  await page.getByRole("button", { name: "COMP - Computer Science" }).click();
}

test.describe("BISONplan", () => {
  test("shows disclaimer before entering the app", async ({ page }) => {
    await openApp(page);

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Before you continue")).toBeVisible();
    await expect(page.getByText("not affiliated")).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("searches courses and adds a section to the planner", async ({ page }) => {
    await openApp(page);
    await acceptDisclaimer(page);

    await expect(page.getByRole("main")).toContainText("Live seats from Aurora");
    await selectFallTerm(page);
    await selectCompSubject(page);

    await expect(page.getByText("COMP 1010")).toBeVisible();
    await page.getByRole("button", { name: "Add to Planner" }).click();

    await expect(page.getByRole("status")).toContainText("COMP 1010");
    await expect(page.getByRole("status")).toContainText("Fall planner");

    await page.getByRole("button", { name: "Weekly Planner" }).click();
    await expect(page.getByRole("button", { name: "Weekly Planner" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    await expect(page.getByLabel("Remove COMP 1010 from planner")).toBeVisible();
  });

  test("opens quick view for a course section", async ({ page }) => {
    await openApp(page);
    await acceptDisclaimer(page);

    await selectFallTerm(page);
    await selectCompSubject(page);

    await page.getByRole("button", { name: "View details for COMP 1010 section A01" }).click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Introduction to Computer Science 1")).toBeVisible();
    await expect(drawer.getByText("An introduction to computer science and programming.")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(drawer).toHaveCount(0);
  });
});
