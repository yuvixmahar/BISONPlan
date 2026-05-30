import {
  formatDateRange,
  formatMonthSpan,
  getCourseDateRange,
  getSummerTimelineBounds,
  getTimelinePosition,
} from "../utils/planner.js";

const SUMMER_MONTHS = ["May", "Jun", "Jul", "Aug"];
const BAR_COLORS = [
  "bg-blue-200 border-blue-300 text-blue-950",
  "bg-amber-200 border-amber-300 text-amber-950",
  "bg-emerald-200 border-emerald-300 text-emerald-950",
  "bg-slate-200 border-slate-300 text-slate-900",
];

function courseCode(course) {
  const subject = course.subjectCode || course.subject || course.subj || "";
  const number =
    course.courseNumber || course.courseNbr || course.courseNum || course.catalogNumber || "";
  if (subject && number) return `${subject} ${number}`;
  return course.courseCode || "Course";
}

function getSection(course) {
  return (
    course.section ||
    course.classSection ||
    course.enrollmentSection ||
    course.sequenceNumber ||
    ""
  );
}

export default function SummerDateTimeline({ courses }) {
  const entries = courses
    .map((course, index) => {
      const range = getCourseDateRange(course);
      return {
        course,
        range,
        code: courseCode(course),
        section: getSection(course),
        colorClass: BAR_COLORS[index % BAR_COLORS.length],
      };
    })
    .filter((entry) => entry.range.start && entry.range.end);

  if (!entries.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Date ranges will appear here once courses include meeting start and end dates.
      </div>
    );
  }

  const { year, start: timelineStart, end: timelineEnd } = getSummerTimelineBounds(courses);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Summer date spans</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Each bar shows when a course runs from month to month.
          </p>
        </div>
        <span className="text-xs text-slate-500">Summer {year}</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-2">
            {SUMMER_MONTHS.map((month) => (
              <div key={month} className="text-xs font-semibold text-slate-600 text-center">
                {month}
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2" role="list" aria-label="Summer course date spans">
            {entries.map(({ course, range, code, section, colorClass }) => {
              const left = getTimelinePosition(range.start, timelineStart, timelineEnd);
              const right = getTimelinePosition(range.end, timelineStart, timelineEnd);
              const width = Math.max(right - left, 2.5);
              const monthSpan = formatMonthSpan(range.start, range.end);
              const dateLabel = formatDateRange(range.start, range.end);

              return (
                <div key={course._plannerId || `${code}-${section}`} role="listitem">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-700 mb-1">
                    <span className="font-medium truncate">
                      {code}
                      {section ? ` · ${section}` : ""}
                    </span>
                    <span className="shrink-0 text-slate-500">{monthSpan}</span>
                  </div>
                  <div
                    className="relative h-8 rounded-md bg-white border border-slate-200"
                    aria-hidden="true"
                  >
                    <div
                      className={`absolute top-1 bottom-1 rounded border px-2 flex items-center text-[11px] font-medium truncate ${colorClass}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={dateLabel}
                    >
                      <span className="truncate">{dateLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
