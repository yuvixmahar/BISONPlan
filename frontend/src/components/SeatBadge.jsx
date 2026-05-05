export default function SeatBadge({
  seatsAvailable,
  waitlistCount,
}) {
  const seats = Number(seatsAvailable ?? 0);
  const waitlist = Number(waitlistCount ?? 0);

  let cls = "bg-green-100 text-green-900 border-green-200";
  let label = `${seats} seats`;

  if (seats === 0) {
    cls = waitlist > 0 ? "bg-red-100 text-red-900 border-red-200" : "bg-red-200 text-red-900 border-red-300";
    if (waitlist > 0) label = `Full — ${waitlist} waitlisted`;
    else label = "Full";
  } else if (seats >= 1 && seats <= 10) {
    cls = "bg-yellow-100 text-yellow-900 border-yellow-200";
    label = waitlist > 0 ? `${seats} seats • ${waitlist} waitlist` : `${seats} seats left`;
  } else {
    cls = "bg-green-100 text-green-900 border-green-200";
    label = `${seats} seats`;
  }

  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded border ${cls}`}>
      {label}
    </span>
  );
}

