import { getCourseCode, getCourseCrn, getCourseTitle } from "./course.js";

// Windows line endings so the .txt opens cleanly in Notepad as well as phones.
const EOL = "\r\n";

function todayIso(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Builds a plain-text schedule for one planner term. The top carries a
 * quick-copy `CRNs:` line for Aurora's "Enter CRNs" registration, followed by a
 * readable `CODE - Title - CRN` list. Mobile-friendly: short lines, no columns.
 */
export function buildPlannerText(termLabel, courses = [], { now = new Date() } = {}) {
  const label = termLabel || "Planner";
  const list = Array.isArray(courses) ? courses : [];
  const lines = [];

  lines.push(`BISONplan — ${label} schedule`);
  lines.push(`Generated ${todayIso(now)}`);
  lines.push("");

  if (list.length === 0) {
    lines.push("No courses added for this term yet.");
    return lines.join(EOL) + EOL;
  }

  const crns = list.map((course) => getCourseCrn(course)).filter(Boolean);
  if (crns.length) {
    lines.push("Register fast: paste these into Aurora → Registration → Enter CRNs");
    lines.push(`CRNs: ${crns.join("  ")}`);
    lines.push("");
  }

  lines.push(`Courses (${list.length})`);
  for (const course of list) {
    const code = getCourseCode(course, { fallback: "Course" });
    const title = getCourseTitle(course);
    const crn = getCourseCrn(course);
    lines.push(`- ${code} - ${title}${crn ? ` - CRN ${crn}` : " - CRN not available"}`);
  }

  lines.push("");
  lines.push("Not official registration. Always confirm seats and details in Aurora.");

  return lines.join(EOL) + EOL;
}

/** e.g. "bisonplan-fall-schedule-2026-07-08.txt" */
export function plannerTextFilename(termLabel, { now = new Date() } = {}) {
  const slug = String(termLabel || "planner")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `bisonplan-${slug || "planner"}-schedule-${todayIso(now)}.txt`;
}

/** Triggers a client-side download of `text` as `filename`. No-op without a DOM. */
export function downloadTextFile(filename, text) {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
