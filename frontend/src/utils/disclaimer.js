const STORAGE_KEY = "bisonplan.disclaimer.accepted.v1";

export function hasAcceptedDisclaimer(storage = globalThis.localStorage) {
  if (!storage?.getItem) return false;
  return storage.getItem(STORAGE_KEY) === "1";
}

export function acceptDisclaimer(storage = globalThis.localStorage) {
  if (!storage?.setItem) return false;
  storage.setItem(STORAGE_KEY, "1");
  return true;
}

export { STORAGE_KEY as DISCLAIMER_STORAGE_KEY };

export const DISCLAIMER_SECTIONS = [
  {
    title: "Unofficial student tool",
    body:
      "BISONplan was built by a U of M student to make course planning easier. It is not affiliated with, endorsed by, or operated by the University of Manitoba.",
  },
  {
    title: "Always verify in Aurora",
    body:
      "Seat counts, waitlists, prerequisites, and section details change often. Confirm every registration decision directly in Aurora before you enroll or drop a course.",
  },
  {
    title: "Data may be delayed",
    body:
      "Course information is fetched from Aurora and cached (about 10 minutes during the day, up to 30 minutes between midnight and 6 AM CST). Data may not always reflect the latest availability.",
  },
  {
    title: "No guarantees",
    body:
      "This site is for planning convenience only. The creator is not responsible for scheduling errors, missed registration windows, or any academic or financial outcomes from using this tool.",
  },
];
