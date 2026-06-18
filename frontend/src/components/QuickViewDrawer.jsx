import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getCourseDescription } from "../api/client.js";
import {
  getCourseCode,
  getCourseCrn,
  getCourseSection,
  getCourseTitle,
  getInstructorName,
  getMeetingDayLabels,
  getMeetingLocation,
  getMeetingsWithFaculty,
  splitSectionInfo,
} from "../utils/course.js";
import { formatTimeRangeFromHhmm } from "../utils/time.js";

const DRAWER_TRANSITION_MS = 300;

export default function QuickViewDrawer({ open, course, termCode, onClose }) {
  const panelRef = useRef(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailData, setDetailData] = useState(null);

  const code = useMemo(() => getCourseCode(activeCourse, { fallback: "" }), [activeCourse]);
  const title = useMemo(() => getCourseTitle(activeCourse), [activeCourse]);
  const section = useMemo(() => getCourseSection(activeCourse), [activeCourse]);
  const instructor = useMemo(() => getInstructorName(activeCourse), [activeCourse]);
  const meetings = useMemo(() => getMeetingsWithFaculty(activeCourse), [activeCourse]);
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

  useLayoutEffect(() => {
    if (!open || !course) {
      setVisible(false);
      setIsEntering(false);
      return;
    }

    setActiveCourse(course);
    setVisible(false);
    setIsEntering(false);
  }, [open, course]);

  useEffect(() => {
    if (!open || !activeCourse) return;

    const frame = requestAnimationFrame(() => {
      panelRef.current?.getBoundingClientRect();
      setIsEntering(true);
      setVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [open, activeCourse]);

  function handlePanelAnimationEnd(event) {
    if (event.target !== event.currentTarget) return;
    if (event.animationName !== "drawer-slide-in") return;
    setIsEntering(false);
  }

  useEffect(() => {
    if (visible || !activeCourse) return;
    const timer = setTimeout(() => setActiveCourse(null), DRAWER_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [visible, activeCourse]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  useEffect(() => {
    if (!open || !activeCourse || !termCode) return;
    const crn = getCourseCrn(activeCourse);
    if (!crn) return;

    let cancelled = false;
    async function run() {
      setDetailLoading(true);
      setDetailError("");
      setDetailData(null);
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
  }, [open, activeCourse, termCode]);

  if (!activeCourse) return null;

  return (
    <div
      className={`fixed inset-0 z-60 ${
        isEntering
          ? "drawer-backdrop-in"
          : visible
            ? "opacity-100"
            : "pointer-events-none opacity-0 transition-opacity duration-300 ease-in-out"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-bison-brown/50"
        onClick={onClose}
        aria-label="Close quick view overlay"
        tabIndex={visible ? 0 : -1}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={code ? `Course details for ${code}` : "Course details"}
        onAnimationEnd={handlePanelAnimationEnd}
        className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-bison-border bg-white shadow-2xl ${
          isEntering
            ? "drawer-slide-in"
            : visible
              ? "translate-x-0"
              : "translate-x-full transition-transform duration-300 ease-in-out"
        }`}
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-bison-border bg-white p-4">
          <div className="min-w-0">
            <div className="font-heading text-xl text-bison-text">{code}</div>
            <div className="text-sm text-bison-text-muted">{title}</div>
            {section ? (
              <div className="mt-1 text-xs text-bison-text-muted">Section {section}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded border border-bison-border px-2 py-1 text-sm hover:bg-bison-gold/10"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-scroll p-4">
          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-bison-text-muted">
              Meeting Details
            </div>
            {meetings.length === 0 ? (
              <div className="text-sm text-bison-text-muted">No meeting details available.</div>
            ) : (
              <div className="space-y-3">
                {meetings.map(({ meetingTime: mt, instructor: meetingInstructor }, idx) => {
                  const days = getMeetingDayLabels(mt).join(" ");
                  const time = formatTimeRangeFromHhmm(mt.beginTime, mt.endTime);
                  const location = getMeetingLocation(mt);
                  const type = mt.meetingTypeDescription || mt.meetingType || "Class";
                  return (
                    <div
                      key={`${idx}-${mt.beginTime}-${mt.endTime}`}
                      className="rounded-lg border border-bison-border p-3"
                    >
                      <div className="mb-2 flex flex-wrap gap-2 text-xs">
                        {days ? (
                          <span className="rounded bg-bison-gold/15 px-2 py-1">{days}</span>
                        ) : null}
                        {time.trim() !== "-" ? (
                          <span className="rounded bg-bison-gold/20 px-2 py-1 text-bison-brown">
                            {time}
                          </span>
                        ) : null}
                        <span className="rounded bg-bison-gold/25 px-2 py-1 text-bison-brown">
                          {type}
                        </span>
                      </div>
                      <div className="text-sm text-bison-text">
                        <span className="font-medium">Instructor:</span>{" "}
                        {meetingInstructor || instructor || "TBA"}
                      </div>
                      <div className="text-sm text-bison-text">
                        <span className="font-medium">Location:</span> {location}
                      </div>
                      <div className="text-sm text-bison-text">
                        <span className="font-medium">Dates:</span> {mt.startDate || "?"} -{" "}
                        {mt.endDate || "?"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-bison-text-muted">
              Course Description
            </div>
            <div className="text-sm leading-relaxed text-bison-text">
              {detailLoading
                ? "Loading description..."
                : detailError
                  ? detailError
                  : detailData?.description || "No description available."}
            </div>
          </section>

          {prereqSplit.main || coreqSplit.main || sectionInfoText ? (
            <section>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-bison-text-muted">
                Requisites
              </div>
              {prereqSplit.main ? (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-semibold text-bison-text-muted">
                    Prerequisites
                  </div>
                  <div className="text-sm leading-relaxed text-bison-text">{prereqSplit.main}</div>
                </div>
              ) : null}
              {coreqSplit.main ? (
                <div>
                  <div className="mb-1 text-xs font-semibold text-bison-text-muted">
                    Corequisites
                  </div>
                  <div className="text-sm leading-relaxed text-bison-text">{coreqSplit.main}</div>
                </div>
              ) : null}
              {sectionInfoText ? (
                <div className="mt-3 rounded-md border border-bison-border bg-bison-cream p-3">
                  <div className="mb-1 text-xs font-semibold text-bison-text">
                    Section Information
                  </div>
                  <div className="text-sm leading-relaxed text-bison-text">{sectionInfoText}</div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
