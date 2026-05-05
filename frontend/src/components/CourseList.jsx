import CourseCard from "./CourseCard.jsx";

export default function CourseList({ courses, termCode }) {
  return (
    <div className="flex flex-col gap-3">
      {courses.length === 0 ? (
        <div className="text-slate-600 bg-white border border-slate-200 rounded-lg p-4">
          No courses match your filters.
        </div>
      ) : (
        courses.map((course, idx) => (
          <CourseCard
            key={course.courseReferenceNumber || course.crn || idx}
            course={course}
            termCode={termCode}
          />
        ))
      )}
    </div>
  );
}

