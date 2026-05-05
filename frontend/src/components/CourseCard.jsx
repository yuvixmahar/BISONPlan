import { useMemo, useState } from "react";
import SeatBadge from "./SeatBadge.jsx";
import { getCourseDescription } from "../api/client.js";

function pickFirst(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

function formatCode(course) {
  const subject = pickFirst(course, ["subjectCode", "subject", "subj"]);
  const number = pickFirst(course, ["courseNumber", "courseNbr", "courseNum", "catalogNumber", "courseNbrText"]);
  if (subject && number) return `${subject} ${number}`.trim();
  return (
    pickFirst(course, ["subjectDescription", "courseCode", "courseReference", "catalogNbr"]) ||
    ""
  );
}

function formatMeeting(course) {
  const meetingTime = pickFirst(course, ["meetingTime", "meetingTimes", "meetingTimeText", "times"]);
  const meetingDays = pickFirst(course, ["meetingDays", "days", "day"]);
  const startTime = pickFirst(course, ["startTime", "beginTime"]);
  const endTime = pickFirst(course, ["endTime", "finishTime"]);

  if (meetingTime) return meetingTime;
  if (meetingDays && startTime && endTime) return `${meetingDays} ${startTime}-${endTime}`;
  if (meetingDays) return meetingDays;
  return "";
}

function meetingEntries(course) {
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  return mf.map((m) => m?.meetingTime || null).filter(Boolean);
}

function meetingDays(mt) {
  const days = [
    ["monday", "M"],
    ["tuesday", "T"],
    ["wednesday", "W"],
    ["thursday", "R"],
    ["friday", "F"],
    ["saturday", "S"],
    ["sunday", "U"],
  ];
  return days.filter(([k]) => Boolean(mt?.[k])).map(([, label]) => label).join(" ");
}

function toAmPm(hhmm) {
  if (!hhmm || String(hhmm).length < 3) return "";
  const raw = String(hhmm).padStart(4, "0");
  const hh = Number(raw.slice(0, 2));
  const mm = raw.slice(2);
  const suffix = hh >= 12 ? "PM" : "AM";
  const twelve = hh % 12 === 0 ? 12 : hh % 12;
  return `${twelve}:${mm} ${suffix}`;
}

function splitSectionInfo(rawText) {
  const raw = (rawText || "").trim();
  if (!raw) return { main: "", sectionInfo: "" };
  const marker = /section information text\s*:/i;
  const parts = raw.split(marker);
  if (parts.length <= 1) return { main: raw, sectionInfo: "" };
  const main = parts[0].trim().replace(/[.\s]+$/, "");
  const sectionInfo = parts.slice(1).join(" ").trim();
  return { main, sectionInfo };
}

export default function CourseCard({ course, termCode, onQuickView }) {
  const [expanded, setExpanded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailData, setDetailData] = useState(null);

  const code = useMemo(() => formatCode(course), [course]);
  const title = useMemo(
    () => pickFirst(course, ["title", "courseTitle", "subjectTitle", "courseDescriptionTitle"], "Untitled"),
    [course]
  );
  const section = useMemo(
    () =>
      pickFirst(
        course,
        ["section", "classSection", "enrollmentSection", "sequenceNumber"],
        ""
      ),
    [course]
  );
  const instructor = useMemo(
    () => pickFirst(course, ["instructorName", "instructor", "instructorNames"], ""),
    [course]
  );
  const credits = useMemo(
    () => pickFirst(course, ["credits", "creditHours", "creditHoursText", "credit"], ""),
    [course]
  );

  const meeting = useMemo(() => formatMeeting(course), [course]);
  const meetings = useMemo(() => meetingEntries(course), [course]);

  const seatsAvailable = pickFirst(course, ["seatsAvailable", "seats_avail", "seats"], null);
  const waitlistCount = pickFirst(course, ["waitlistCount", "waitlist", "waitCount", "waitlistCountText"], null);
  const seatsCapacity = pickFirst(course, ["maximumEnrollment", "seatCapacity", "capacity"], null);
  const waitlistCapacity = pickFirst(course, ["waitCapacity", "waitlistCapacity"], null);

  const prerequisitesRaw =
    detailData?.prerequisites_raw ?? course.prerequisites_raw ?? "";
  const corequisitesRaw =
    detailData?.corequisites_raw ?? course.corequisites_raw ?? "";
  const prereqSplit = splitSectionInfo(prerequisitesRaw);
  const coreqSplit = splitSectionInfo(corequisitesRaw);
  const displayDescription =
    detailData?.description ?? course.description ?? "";

  async function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (!next) return;
    if (detailLoaded || detailLoading) return;

    const crn = pickFirst(course, ["courseReferenceNumber", "crn"], "");
    if (!crn || !termCode) return;

    setDetailLoading(true);
    setDetailError("");
    try {
      const res = await getCourseDescription(crn, termCode);
      setDetailData(res?.data || null);
      setDetailLoaded(true);
    } catch (e) {
      setDetailError("Failed to load description.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white shadow-sm">
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full text-left px-4 py-3 flex gap-3 items-start"
      >
        <div className="flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0">
              <div className="font-heading font-semibold text-slate-900 leading-tight">
                {code || "Course"}
              </div>
              <div className="text-sm text-slate-600 mt-0.5 truncate">
                {title}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {section ? `Section ${section}` : "Section —"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {credits ? `${credits} credits` : ""}
                {credits && meeting ? " • " : ""}
                {meeting ? meeting : ""}
              </div>
              {instructor ? (
                <div className="text-xs text-slate-500 mt-1">
                  Instructor: {instructor}
                </div>
              ) : null}
              {meetings.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {meetings.slice(0, 2).map((mt, idx) => {
                    const days = meetingDays(mt);
                    const time = `${toAmPm(mt.beginTime)}-${toAmPm(mt.endTime)}`.replace(/\s+/g, " ");
                    const building = mt.buildingDescription || mt.building || "";
                    const room = mt.room || "";
                    const loc = building && room
                      ? `${building} ${room}`
                      : building || room || "TBA";
                    return (
                      <span
                        key={`${idx}-${mt.beginTime}-${mt.endTime}`}
                        className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700"
                      >
                        {days ? `${days} ` : ""}{time} • {loc}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shrink-0 w-40">
          <SeatBadge
            seatsAvailable={seatsAvailable}
            waitlistCount={waitlistCount}
            seatsCapacity={seatsCapacity}
            waitlistCapacity={waitlistCapacity}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onQuickView?.(course);
            }}
            className="mt-2 w-full text-[11px] px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
          >
            Quick View
          </button>
        </div>
      </button>

      {expanded ? (
        <div className="px-4 pb-4 -mt-2">
          <div className="text-sm text-slate-700 leading-relaxed mt-1">
            {detailLoading
              ? "Loading description..."
              : detailError
              ? detailError
              : displayDescription
              ? displayDescription
              : "No description available."}
          </div>

          {(prereqSplit.main || coreqSplit.main || course.note) ? (
            <div className="mt-3">
              {prereqSplit.main ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xs font-bold text-amber-900 mb-1">
                    Prerequisites
                  </div>
                  <div className="text-sm text-amber-950 leading-relaxed">
                    {prereqSplit.main}
                  </div>
                </div>
              ) : null}

              {coreqSplit.main ? (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 mt-2">
                  <div className="text-xs font-bold text-blue-900 mb-1">
                    Pre- or Corequisite
                  </div>
                  <div className="text-sm text-blue-950 leading-relaxed">
                    {coreqSplit.main}
                  </div>
                </div>
              ) : null}

              {course.note ? (
                <div className="text-xs text-slate-600 mt-3">
                  Note: {course.note}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

