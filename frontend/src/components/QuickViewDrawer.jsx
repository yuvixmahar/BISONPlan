import { useEffect, useMemo, useState } from "react";
import { getCourseDescription } from "../api/client.js";

function pickFirst(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
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

function meetingEntries(course) {
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  return mf
    .map((m) => m?.meetingTime || null)
    .filter(Boolean);
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
  return days.filter(([k]) => Boolean(mt?.[k])).map(([, label]) => label);
}

export default function QuickViewDrawer({ open, course, termCode, onClose }) {
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailData, setDetailData] = useState(null);

  const code = useMemo(() => {
    const subject = pickFirst(course, ["subjectCode", "subject", "subj"]);
    const number = pickFirst(course, ["courseNumber", "courseNbr", "courseNum", "catalogNumber"]);
    return subject && number ? `${subject} ${number}` : pickFirst(course, ["subjectDescription", "courseCode"], "");
  }, [course]);

  const title = useMemo(
    () => pickFirst(course, ["title", "courseTitle", "subjectTitle"], "Course"),
    [course]
  );

  const section = useMemo(
    () => pickFirst(course, ["section", "classSection", "enrollmentSection"], ""),
    [course]
  );

  const meetings = useMemo(() => meetingEntries(course), [course]);

  useEffect(() => {
    if (!open || !course || !termCode) return;
    const crn = pickFirst(course, ["courseReferenceNumber", "crn"], "");
    if (!crn) return;

    let cancelled = false;
    async function run() {
      setDetailLoading(true);
      setDetailError("");
      try {
        const res = await getCourseDescription(crn, termCode);
        if (!cancelled) setDetailData(res?.data || null);
      } catch {
        if (!cancelled) setDetailError("Failed to load description.");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [open, course, termCode]);

  if (!open || !course) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-label="Close quick view overlay"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <div className="font-heading text-xl text-slate-900">{code}</div>
            <div className="text-sm text-slate-600">{title}</div>
            {section ? <div className="text-xs text-slate-500 mt-1">Section {section}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-2 py-1 border border-slate-200 rounded hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <section>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Meeting Details
            </div>
            {meetings.length === 0 ? (
              <div className="text-sm text-slate-600">No meeting details available.</div>
            ) : (
              <div className="space-y-3">
                {meetings.map((mt, idx) => {
                  const days = meetingDays(mt).join(" ");
                  const time = `${toAmPm(mt.beginTime)} - ${toAmPm(mt.endTime)}`.trim();
                  const building = mt.buildingDescription || mt.building || "TBA";
                  const room = mt.room || "TBA";
                  const type = mt.meetingTypeDescription || mt.meetingType || "Class";
                  return (
                    <div key={`${idx}-${mt.beginTime}-${mt.endTime}`} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-2 text-xs mb-2">
                        {days ? <span className="px-2 py-1 rounded bg-slate-100">{days}</span> : null}
                        {time.trim() !== "-" ? <span className="px-2 py-1 rounded bg-blue-50 text-blue-800">{time}</span> : null}
                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800">{type}</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium">Location:</span> {building} {room !== "TBA" ? `• Room ${room}` : ""}
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium">Dates:</span> {mt.startDate || "?"} - {mt.endDate || "?"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Course Description
            </div>
            <div className="text-sm text-slate-700 leading-relaxed">
              {detailLoading
                ? "Loading description..."
                : detailError
                ? detailError
                : detailData?.description || "No description available."}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

