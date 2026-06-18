const FALL_TERM = { code: "202590", description: "Fall Term 2025-2026" };
const COMP_SUBJECT = { code: "COMP", description: "Computer Science" };

export const mockTerms = [FALL_TERM];

export const mockSubjects = [COMP_SUBJECT];

export const mockCourses = [
  {
    subjectCode: "COMP",
    courseNumber: "1010",
    sequenceNumber: "A01",
    courseReferenceNumber: "12345",
    title: "Introduction to Computer Science 1",
    credits: "3",
    seatsAvailable: 10,
    maximumEnrollment: 50,
    faculty: [{ displayName: "Dr. Smith", primaryIndicator: true }],
    meetingsFaculty: [
      {
        meetingTime: {
          monday: true,
          wednesday: true,
          friday: true,
          beginTime: "1030",
          endTime: "1145",
          startDate: "09/03/2025",
          endDate: "12/05/2025",
          buildingDescription: "EITC E2",
          room: "123",
        },
      },
    ],
  },
];

export const mockCourseDescription = {
  prerequisites_raw: "None",
  corequisites_raw: "",
  description: "An introduction to computer science and programming.",
};
