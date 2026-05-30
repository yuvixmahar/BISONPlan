export function pickFirst(obj, keys, fallback = "") {
  for (const k of keys) {
    if (obj && obj[k] != null && obj[k] !== "") return obj[k];
  }
  return fallback;
}

const SECTION_KEYS = [
  "sequenceNumber",
  "section",
  "classSection",
  "enrollmentSection",
  "courseSection",
  "sectionNumber",
  "sequence",
];

export function getCourseSection(course) {
  return pickFirst(course, SECTION_KEYS, "");
}

export function getCourseCode(course) {
  const subject = pickFirst(course, ["subjectCode", "subject", "subj"]);
  const number = pickFirst(course, ["courseNumber", "courseNbr", "courseNum", "catalogNumber"]);
  if (subject && number) return `${subject} ${number}`.trim();
  return pickFirst(course, ["courseCode", "subjectDescription"], "Course");
}

/** Course code plus section (e.g. "COMP 1010 · A01") for labels and toasts. */
export function getCourseDisplayLabel(course) {
  const code = getCourseCode(course);
  const section = getCourseSection(course);
  return section ? `${code} · ${section}` : code;
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
