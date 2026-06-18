export default function FilterPanel({
  includeFullClasses,
  setIncludeFullClasses,
  onlyWaitlisted,
  setOnlyWaitlisted,
  creditHour,
  setCreditHour,
  scheduleType,
  setScheduleType,
  campus,
  setCampus,
  campusOptions,
  deliveryMode,
  setDeliveryMode,
  deliveryOptions,
  dayFilter,
  setDayFilter,
  timeFilter,
  setTimeFilter,
  instructorFilter,
  setInstructorFilter,
  onClearFilters,
}) {
  return (
    <div className="bg-white border border-bison-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-bison-brown">Filters</div>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-xs px-2 py-1 rounded-md border border-bison-border hover:bg-bison-cream"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-bison-text">
          <input
            type="checkbox"
            checked={includeFullClasses}
            onChange={(e) => setIncludeFullClasses(e.target.checked)}
          />
          Include full classes
        </label>

        <label className="flex items-center gap-2 text-sm text-bison-text">
          <input
            type="checkbox"
            checked={onlyWaitlisted}
            onChange={(e) => setOnlyWaitlisted(e.target.checked)}
          />
          Only classes with waitlist
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-1">
          <label className="block text-xs text-bison-text-muted mb-1">Credits</label>
          <select
            value={creditHour}
            onChange={(e) => setCreditHour(e.target.value)}
            className="w-full border border-bison-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-bison-gold"
          >
            <option value="">Any</option>
            <option value="1">1 credit</option>
            <option value="2">2 credits</option>
            <option value="3">3 credits</option>
            <option value="4">4 credits</option>
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs text-bison-text-muted mb-1">Schedule</label>
          <select
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
            className="w-full border border-bison-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-bison-gold"
          >
            <option value="any">Any</option>
            <option value="days">Has meeting times</option>
            <option value="none">No meeting times</option>
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs text-bison-text-muted mb-1">Campus</label>
          <select
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            className="w-full border border-bison-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-bison-gold"
          >
            <option value="any">Any</option>
            {campusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-1">
          <label className="block text-xs text-bison-text-muted mb-1">Delivery mode</label>
          <select
            value={deliveryMode}
            onChange={(e) => setDeliveryMode(e.target.value)}
            className="w-full border border-bison-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-bison-gold"
          >
            <option value="any">Any</option>
            {deliveryOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:col-span-2">
          <div>
            <label className="block text-xs text-bison-text-muted mb-1">Day</label>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full border border-bison-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-bison-gold"
            >
              <option value="any">Any</option>
              <option value="M">Monday</option>
              <option value="T">Tuesday</option>
              <option value="W">Wednesday</option>
              <option value="R">Thursday</option>
              <option value="F">Friday</option>
              <option value="S">Saturday</option>
              <option value="U">Sunday</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-bison-text-muted mb-1">Time</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full border border-bison-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-bison-gold"
            >
              <option value="any">Any</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs text-bison-text-muted mb-1">Instructor</label>
          <input
            value={instructorFilter}
            onChange={(e) => setInstructorFilter(e.target.value)}
            placeholder="e.g. Smith"
            className="w-full border border-bison-border rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-bison-gold"
          />
        </div>
      </div>
    </div>
  );
}

