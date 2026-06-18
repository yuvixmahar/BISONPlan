import CourseCard from "./CourseCard.jsx";

export default function CourseList({ courses, termCode, onQuickView, onAddToPlanner }) {
  return (
    <div className="flex flex-col gap-3">
      {courses.length === 0 ? (
        <div className="text-bison-text-muted bg-white border border-bison-border rounded-lg p-4">
          No courses match your filters.
        </div>
      ) : (
        courses.map((course, idx) => (
          <CourseCard
            key={course.courseReferenceNumber || course.crn || idx}
            course={course}
            onQuickView={onQuickView}
            onAddToPlanner={onAddToPlanner}
          />
        ))
      )}
    </div>
  );
}

