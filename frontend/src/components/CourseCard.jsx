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

  const meetingChips = meetings.slice(0, 2).map((mt, idx) => {
    const days = formatMeetingDayLabels(mt);
    const time = `${formatHhmmAmPm(mt.beginTime)}–${formatHhmmAmPm(mt.endTime)}`.replace(/\s+/g, " ");
    const loc = getMeetingLocation(mt);
    return { key: `${idx}-${mt.beginTime}-${mt.endTime}`, days, time, loc };
  });

  return (
    <div className="group border border-bison-border rounded-lg bg-white shadow-sm transition-all duration-150 hover:border-bison-gold/50 hover:bg-bison-gold/10 hover:shadow-md">

      {/* ── Desktop layout ── */}
      <div className="hidden sm:block">
        <div className="flex gap-3 items-start px-4 py-3">
          <button
            type="button"
            onClick={() => onQuickView?.(course)}
            aria-label={detailLabel}
            aria-haspopup="dialog"
            className="flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold focus-visible:ring-offset-2 rounded-md"
          >
            <div className="font-heading font-semibold text-bison-text leading-tight">{code || "Course"}</div>
            <div className="text-sm text-bison-text-muted mt-0.5 truncate">{title}</div>
            <div className="text-xs text-bison-text-muted mt-1 flex flex-wrap items-center gap-x-1.5">
              <span>{section ? `Section ${section}` : "Section —"}</span>
              <span aria-hidden="true" className="text-bison-border">·</span>
              <span>{instructor || "Instructor TBA"}</span>
              {credits && <><span aria-hidden="true" className="text-bison-border">·</span><span>{credits} credits</span></>}
            </div>
            {meetingChips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {meetingChips.map(({ key, days, time, loc }) => (
                  <span key={key} className="text-[11px] px-2 py-1 rounded border border-bison-border bg-bison-cream text-bison-text">
                    {days ? `${days} ` : ""}{time}{loc ? ` • ${loc}` : ""}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-2 text-[11px] text-bison-text-muted/80 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              Click for course details
            </div>
          </button>

          <div className="shrink-0 w-40">
            <SeatBadge
              seatsAvailable={seatsAvailable}
              waitlistCount={waitlistCount}
              seatsCapacity={seatsCapacity}
              waitlistCapacity={waitlistCapacity}
              boxed
            />
          </div>
        </div>
        <div className="mx-4 border-t border-bison-border/60" />
        <button
          type="button"
          onClick={() => onAddToPlanner?.(course)}
          className="w-full cursor-pointer px-4 py-2.5 text-sm font-medium text-bison-brown bg-bison-gold/10 hover:bg-bison-gold/25 active:bg-bison-gold/35 transition-colors rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold focus-visible:ring-offset-2"
        >
          + Add to Planner
        </button>
      </div>

      {/* ── Mobile layout ── */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => onQuickView?.(course)}
          aria-label={detailLabel}
          aria-haspopup="dialog"
          className="w-full text-left px-4 pt-4 pb-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold focus-visible:ring-offset-2"
        >
          <div className="font-heading font-bold text-sm text-bison-text leading-tight">{code || "Course"}</div>
          <div className="text-xs font-medium text-bison-text mt-0.5 leading-snug">{title}</div>
          <div className="mt-1.5">
            <SeatBadge
              seatsAvailable={seatsAvailable}
              waitlistCount={waitlistCount}
              seatsCapacity={seatsCapacity}
              waitlistCapacity={waitlistCapacity}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-bison-text-muted">
            {section && <span>Section {section}</span>}
            {section && instructor && <span aria-hidden="true" className="text-bison-border">·</span>}
            {instructor && <span className="break-words">{instructor}</span>}
            {credits && (instructor || section) && <span aria-hidden="true" className="text-bison-border">·</span>}
            {credits && <span>{credits} cr</span>}
          </div>
          {meetingChips.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {meetingChips.map(({ key, days, time, loc }) => (
                <span key={key} className="inline-flex flex-wrap items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-bison-border bg-bison-cream text-bison-text-muted">
                  {days && <span className="font-medium text-bison-text">{days}</span>}
                  <span>{time}</span>
                  {loc && <><span aria-hidden="true">·</span><span>{loc}</span></>}
                </span>
              ))}
            </div>
          ) : meeting ? (
            <div className="mt-1.5 text-[11px] text-bison-text-muted">{meeting}</div>
          ) : null}
          <div className="mt-2 text-[11px] text-bison-text-muted/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
            Tap for details
          </div>
        </button>
        <div className="mx-4 border-t border-bison-border/60" />
        <button
          type="button"
          onClick={() => onAddToPlanner?.(course)}
          className="w-full cursor-pointer px-4 py-2.5 text-sm font-medium text-bison-brown bg-bison-gold/10 hover:bg-bison-gold/25 active:bg-bison-gold/35 transition-colors rounded-b-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bison-gold focus-visible:ring-offset-2"
        >
          + Add to Planner
        </button>
      </div>

    </div>
  );
}
