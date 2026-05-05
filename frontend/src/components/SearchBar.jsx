export default function SearchBar({ value, onChange }) {
  return (
    <div className="w-full">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by course number or title..."
        className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
    </div>
  );
}

