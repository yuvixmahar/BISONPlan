import { useMemo } from "react";
import SeatBadge from "./SeatBadge.jsx";
import {
  formatLegacyMeetingLine,
  formatMeetingDayLabels,
  getCourseCode,
  getCourseSection,
  getCourseTitle,
  getInstructorName,
  getMeetingLocation,
  getMeetingTimes,
  pickFirst,
} from "../utils/course.js";
import { formatHhmmAmPm } from "../utils/time.js";

export default function CourseCard({ course, onQuickView, onAddToPlanner }) {
  const code = useMemo(() => getCourseCode(course, { fallback: "" }), [course]);
  const title = useMemo(() => getCourseTitle(course), [course]);
  const section = useMemo(() => getCourseSection(course), [course]);
  const instructor = useMemo(() => getInstructorName(course), [course]);
  const credits = useMemo(
    () => pickFirst(course, ["credits", "creditHours", "creditHoursText", "credit"], ""),
    [course]
  );
  const meeting = useMemo(() => formatLegacyMeetingLine(course), [course]);
  const meetings = useMemo(() => getMeetingTimes(course), [course]);

  const seatsAvailable = pickFirst(course, ["seatsAvailable", "seats_avail", "seats"], null);
  const waitlistCount = pickFirst(course, ["waitlistCount", "waitlist", "waitCount", "waitlistCountText"], null);
  const seatsCapacity = pickFirst(course, ["maximumEnrollment", "seatCapacity", "capacity"], null);
  const waitlistCapacity = pickFirst(course, ["waitCapacity", "waitlistCapacity"], null);

  const detailLabel = code
    ? `View details for ${code}${section ? ` section ${section}` : ""}`
    : "View course details";

  return (
    <div className="group border border-slate-200 rounded-lg bg-white shadow-sm transition-all duration-150 hover:border-slate-300 hover:bg-slate-50/60 hover:shadow-md">
      <div className="flex gap-3 items-start px-4 py-3">
        <button
          type="button"
          onClick={() => onQuickView?.(course)}
          aria-label={detailLabel}
          className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 rounded-md"
        >
          <div className="font-heading font-semibold text-slate-900 leading-tight">
            {code || "Course"}
          </div>
          <div className="text-sm text-slate-600 mt-0.5 truncate">{title}</div>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-1.5">
            <span>{section ? `Section ${section}` : "Section —"}</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>{instructor || "Instructor TBA"}</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {credits ? `${credits} credits` : ""}
            {credits && meeting ? " · " : ""}
            {meeting ? meeting : ""}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            Click for course details
          </div>
          {meetings.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {meetings.slice(0, 2).map((mt, idx) => {
                const days = formatMeetingDayLabels(mt);
                const time = `${formatHhmmAmPm(mt.beginTime)}-${formatHhmmAmPm(mt.endTime)}`.replace(
                  /\s+/g,
                  " "
                );
                const loc = getMeetingLocation(mt);
                return (
                  <span
                    key={`${idx}-${mt.beginTime}-${mt.endTime}`}
                    className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    {days ? `${days} ` : ""}
                    {time} • {loc}
                  </span>
                );
              })}
            </div>
          ) : null}
        </button>

        <div className="shrink-0 w-40">
          <SeatBadge
            seatsAvailable={seatsAvailable}
            waitlistCount={waitlistCount}
            seatsCapacity={seatsCapacity}
            waitlistCapacity={waitlistCapacity}
          />
          <button
            type="button"
            onClick={() => onAddToPlanner?.(course)}
            className="mt-2 w-full text-[11px] px-2 py-1 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
          >
            Add to Planner
          </button>
        </div>
      </div>
    </div>
  );
}
