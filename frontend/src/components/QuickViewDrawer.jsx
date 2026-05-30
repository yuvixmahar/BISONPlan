import { useEffect, useMemo, useState } from "react";
import { getCourseDescription } from "../api/client.js";
import {
  getCourseCode,
  getCourseCrn,
  getCourseSection,
  getCourseTitle,
  getInstructorName,
  getMeetingDayLabels,
  getMeetingsWithFaculty,
  splitSectionInfo,
} from "../utils/course.js";
import { formatTimeRangeFromHhmm } from "../utils/time.js";

export default function QuickViewDrawer({ open, course, termCode, onClose }) {
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailData, setDetailData] = useState(null);

  const code = useMemo(() => getCourseCode(course, { fallback: "" }), [course]);
  const title = useMemo(() => getCourseTitle(course), [course]);
  const section = useMemo(() => getCourseSection(course), [course]);
  const instructor = useMemo(() => getInstructorName(course), [course]);
  const meetings = useMemo(() => getMeetingsWithFaculty(course), [course]);
  const prereqSplit = useMemo(
    () => splitSectionInfo(detailData?.prerequisites_raw || ""),
    [detailData]
  );
  const coreqSplit = useMemo(
    () => splitSectionInfo(detailData?.corequisites_raw || ""),
    [detailData]
  );
  const sectionInfoText = useMemo(() => {
    return prereqSplit.sectionInfo || coreqSplit.sectionInfo || "";
  }, [prereqSplit, coreqSplit]);

  useEffect(() => {
    if (!open || !course || !termCode) return;
    const crn = getCourseCrn(course);
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
        <div className="p-4 flex items-start justify-between gap-3">
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
                {meetings.map(({ meetingTime: mt, instructor: meetingInstructor }, idx) => {
                  const days = getMeetingDayLabels(mt).join(" ");
                  const time = formatTimeRangeFromHhmm(mt.beginTime, mt.endTime);
                  const building = mt.buildingDescription || mt.building || "TBA";
                  const room = mt.room || "TBA";
                  const type = mt.meetingTypeDescription || mt.meetingType || "Class";
                  return (
                    <div key={`${idx}-${mt.beginTime}-${mt.endTime}`} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-2 text-xs mb-2">
                        {days ? <span className="px-2 py-1 rounded bg-slate-100">{days}</span> : null}
                        {time.trim() !== "-" ? (
                          <span className="px-2 py-1 rounded bg-blue-50 text-blue-800">{time}</span>
                        ) : null}
                        <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800">{type}</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium">Instructor:</span>{" "}
                        {meetingInstructor || instructor || "TBA"}
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="font-medium">Location:</span> {building}{" "}
                        {room !== "TBA" ? `• Room ${room}` : ""}
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

          {(prereqSplit.main || coreqSplit.main || sectionInfoText) ? (
            <section>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Requisites
              </div>
              {prereqSplit.main ? (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Prerequisites</div>
                  <div className="text-sm text-slate-700 leading-relaxed">{prereqSplit.main}</div>
                </div>
              ) : null}
              {coreqSplit.main ? (
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">Corequisites</div>
                  <div className="text-sm text-slate-700 leading-relaxed">{coreqSplit.main}</div>
                </div>
              ) : null}
              {sectionInfoText ? (
                <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-700 mb-1">Section Information</div>
                  <div className="text-sm text-slate-700 leading-relaxed">{sectionInfoText}</div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
