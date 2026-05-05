export default function FilterPanel({
  openOnly,
  setOpenOnly,
  creditHour,
  setCreditHour,
  scheduleType,
  setScheduleType,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
          />
          Open sections only
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Credits</span>
          <select
            value={creditHour}
            onChange={(e) => setCreditHour(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">Any</option>
            <option value="1">1 credit</option>
            <option value="2">2 credits</option>
            <option value="3">3 credits</option>
            <option value="4">4 credits</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Schedule</span>
          <select
            value={scheduleType}
            onChange={(e) => setScheduleType(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="any">Any</option>
            <option value="days">Has meeting times</option>
            <option value="none">No meeting times</option>
          </select>
        </div>
      </div>
    </div>
  );
}

