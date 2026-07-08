import {
  getCourseCode,
  getCourseCrn,
  getCourseSection,
  formatMeetingDayLabels,
  getMeetingTimes,
} from "../utils/course.js";
import { formatHhmmAmPm } from "../utils/time.js";
import { CHANGE_FULL, CHANGE_REMOVED, CHANGE_TIME } from "../utils/plannerFreshness.js";

function meetingSummary(course) {
  const parts = getMeetingTimes(course)
    .map((mt) => {
      const days = formatMeetingDayLabels(mt);
      const time = `${formatHhmmAmPm(mt.beginTime)}–${formatHhmmAmPm(mt.endTime)}`
        .replace(/\s+/g, " ")
        .trim();
      return `${days ? `${days} ` : ""}${time}`.trim();
    })
    .filter((s) => s && s !== "–");
  return parts.length ? parts.join("; ") : "TBA";
}

function ChangeLine({ change, stored, fresh }) {
  if (change.type === CHANGE_REMOVED) {
    return <li className="text-red-700">• No longer offered in this term (CRN not found).</li>;
  }
  if (change.type === CHANGE_TIME) {
    return (
      <li className="text-bison-text">
        • Meeting time changed:{" "}
        <span className="text-bison-text-muted line-through">{meetingSummary(stored)}</span>{" "}
        → <span className="font-medium">{meetingSummary(fresh)}</span>
      </li>
    );
  }
  if (change.type === CHANGE_FULL) {
    return <li className="text-bison-text">• Section is now full (no seats left).</li>;
  }
  return null;
}

export default function PlannerFreshnessNotice({ issues, onUpdate, onRemove, onResolve, onDismiss }) {
  if (!issues.length) return null;

  return (
    <div className="rounded-xl border border-bison-gold bg-bison-gold/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-bison-brown">
            <path
              d="M10 7v4m0 3h.01M8.6 3.2 2.3 14a1.6 1.6 0 0 0 1.4 2.4h12.6a1.6 1.6 0 0 0 1.4-2.4L11.4 3.2a1.6 1.6 0 0 0-2.8 0Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h3 className="font-heading font-semibold text-bison-brown">
              Heads up — {issues.length} planned course{issues.length !== 1 ? "s" : ""} changed
            </h3>
            <p className="mt-0.5 text-xs text-bison-text-muted">
              Aurora updated these during registration. Review before you register.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          className="shrink-0 cursor-pointer rounded-md border border-bison-border bg-white px-2 py-1 text-xs text-bison-text-muted hover:bg-bison-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold"
        >
          Dismiss
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {issues.map((issue) => {
          const code = getCourseCode(issue.course, { fallback: "Course" });
          const section = getCourseSection(issue.course);
          const crn = getCourseCrn(issue.course);
          const removed = !issue.fresh;

          return (
            <li key={issue.id} className="rounded-lg border border-bison-border bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-bison-text">
                    {code}
                    {section ? ` · ${section}` : ""}
                    {crn ? (
                      <span className="ml-1.5 font-medium text-bison-text-muted">CRN {crn}</span>
                    ) : null}
                  </div>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {issue.changes.map((change, idx) => (
                      <ChangeLine
                        key={`${issue.id}-${change.type}-${idx}`}
                        change={change}
                        stored={issue.course}
                        fresh={issue.fresh}
                      />
                    ))}
                  </ul>
                </div>

                <div className="flex shrink-0 flex-col gap-1.5">
                  {!removed ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdate(issue.termKey, issue.id, issue.fresh);
                        onResolve(issue.id);
                      }}
                      className="cursor-pointer rounded-md border border-bison-gold bg-bison-gold/20 px-2.5 py-1 text-xs font-medium text-bison-brown hover:bg-bison-gold/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold"
                    >
                      Update
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(issue.termKey, issue.id);
                      onResolve(issue.id);
                    }}
                    className="cursor-pointer rounded-md border border-bison-border bg-white px-2.5 py-1 text-xs text-bison-text hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
