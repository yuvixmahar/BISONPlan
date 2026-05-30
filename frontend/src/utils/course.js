export function pickFirst(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

export const MEETING_DAY_ENTRIES = [
  ["monday", "M"],
  ["tuesday", "T"],
  ["wednesday", "W"],
  ["thursday", "R"],
  ["friday", "F"],
  ["saturday", "S"],
  ["sunday", "U"],
];

export const PLANNER_DAY_KEYS = MEETING_DAY_ENTRIES.map(([key]) => key);

const SECTION_KEYS = [
  "sequenceNumber",
  "section",
  "classSection",
  "enrollmentSection",
  "courseSection",
  "sectionNumber",
  "sequence",
];

const SUBJECT_KEYS = ["subjectCode", "subject", "subj"];
const NUMBER_KEYS = [
  "courseNumber",
  "courseNbr",
  "courseNum",
  "catalogNumber",
  "courseNbrText",
  "catalogNbr",
];
const CODE_FALLBACK_KEYS = [
  "courseCode",
  "subjectDescription",
  "courseReference",
];

export function getCourseSection(course) {
  return pickFirst(course, SECTION_KEYS, "");
}

export function getCourseCode(course, { fallback = "Course" } = {}) {
  const subject = pickFirst(course, SUBJECT_KEYS);
  const number = pickFirst(course, NUMBER_KEYS);
  if (subject && number) return `${subject} ${number}`.trim();
  return pickFirst(course, CODE_FALLBACK_KEYS, fallback);
}

/** Course code plus section (e.g. "COMP 1010 · A01") for labels and toasts. */
export function getCourseDisplayLabel(course) {
  const code = getCourseCode(course);
  const section = getCourseSection(course);
  return section ? `${code} · ${section}` : code;
}

export function getCourseTitle(course) {
  return pickFirst(
    course,
    ["title", "courseTitle", "subjectTitle", "courseDescriptionTitle"],
    "Untitled"
  );
}

export function getCourseCrn(course) {
  return pickFirst(course, ["courseReferenceNumber", "crn"], "");
}

export function getMeetingTimes(course) {
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  return mf.map((entry) => entry?.meetingTime).filter(Boolean);
}

export function getMeetingDayLabels(meetingTime) {
  return MEETING_DAY_ENTRIES.filter(([key]) => Boolean(meetingTime?.[key])).map(
    ([, label]) => label
  );
}

export function formatMeetingDayLabels(meetingTime) {
  return getMeetingDayLabels(meetingTime).join("");
}

export function getMeetingLocation(meetingTime) {
  const building = meetingTime?.buildingDescription || meetingTime?.building || "";
  const room = meetingTime?.room || "";
  if (building && room) return `${building} ${room}`;
  if (building) return building;
  if (room) return `Room ${room}`;
  return "Location TBA";
}

export function formatLegacyMeetingLine(course) {
  const meetingTime = pickFirst(course, ["meetingTime", "meetingTimes", "meetingTimeText", "times"]);
  const meetingDays = pickFirst(course, ["meetingDays", "days", "day"]);
  const startTime = pickFirst(course, ["startTime", "beginTime"]);
  const endTime = pickFirst(course, ["endTime", "finishTime"]);

  if (meetingTime) return meetingTime;
  if (meetingDays && startTime && endTime) return `${meetingDays} ${startTime}-${endTime}`;
  if (meetingDays) return meetingDays;
  return "";
}

function formatFacultyName(faculty) {
  if (!faculty) return "";
  if (Array.isArray(faculty)) {
    const names = faculty.map(formatFacultyName).filter(Boolean);
    return [...new Set(names)].join(", ");
  }
  if (typeof faculty === "string") return faculty.trim();
  const direct = pickFirst(faculty, ["displayName", "name", "preferredName"], "");
  if (direct) return direct;
  const combined = `${faculty.firstName || ""} ${faculty.lastName || ""}`.trim();
  return combined;
}

function facultyNamesFromList(facultyList) {
  if (!Array.isArray(facultyList) || !facultyList.length) return [];

  const sorted = [...facultyList].sort((a, b) => {
    const aPrimary = Boolean(a?.primaryIndicator);
    const bPrimary = Boolean(b?.primaryIndicator);
    if (aPrimary === bPrimary) return 0;
    return aPrimary ? -1 : 1;
  });

  const seen = new Set();
  const names = [];
  for (const entry of sorted) {
    const name = formatFacultyName(entry);
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

export function getInstructorName(course) {
  const direct = pickFirst(course, ["instructorName", "instructor"], "");
  if (direct) return direct;

  const namesField = course?.instructorNames;
  if (Array.isArray(namesField)) {
    const joined = namesField.filter(Boolean).join(", ");
    if (joined) return joined;
  }
  if (typeof namesField === "string" && namesField) return namesField;

  const topLevelFaculty = facultyNamesFromList(course?.faculty);
  if (topLevelFaculty.length) return topLevelFaculty.join(", ");

  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  const meetingFaculty = [];
  for (const entry of mf) {
    meetingFaculty.push(...facultyNamesFromList(entry?.faculty));
  }
  if (meetingFaculty.length) return [...new Set(meetingFaculty)].join(", ");

  return "";
}

export function getMeetingsWithFaculty(course) {
  const courseInstructor = getInstructorName(course);
  const mf = Array.isArray(course?.meetingsFaculty) ? course.meetingsFaculty : [];
  return mf
    .map((entry) => {
      const meetingInstructors = facultyNamesFromList(entry?.faculty);
      return {
        meetingTime: entry?.meetingTime || null,
        instructor: meetingInstructors.join(", ") || courseInstructor,
      };
    })
    .filter((entry) => entry.meetingTime);
}

export function splitSectionInfo(rawText) {
  const raw = (rawText || "").trim();
  if (!raw) return { main: "", sectionInfo: "" };
  const marker = /section information text\s*:/i;
  const parts = raw.split(marker);
  if (parts.length <= 1) return { main: raw, sectionInfo: "" };
  const main = parts[0].trim().replace(/[.\s]+$/, "");
  const sectionInfo = parts.slice(1).join(" ").trim();
  return { main, sectionInfo };
}
