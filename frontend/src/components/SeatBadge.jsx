export default function SeatBadge({
  seatsAvailable,
  waitlistCount,
  seatsCapacity,
  waitlistCapacity,
}) {
  const seats = Number(seatsAvailable ?? 0);
  const waitlist = Number(waitlistCount ?? 0);
  const seatCapNum = Number(seatsCapacity ?? 0);
  const waitCapNum = Number(waitlistCapacity ?? 0);

  const seatCap = Number.isFinite(seatCapNum) && seatCapNum > 0 ? seatCapNum : null;
  const waitCap = Number.isFinite(waitCapNum) && waitCapNum > 0 ? waitCapNum : null;

  const seatStatus = seats <= 0 ? "full" : seats <= 10 ? "limited" : "open";
  const waitFull = waitCap !== null && waitlist >= waitCap;

  const statusCls =
    seatStatus === "open"
      ? "bg-green-100 text-green-900 border-green-200"
      : seatStatus === "limited"
      ? "bg-bison-gold/25 text-bison-brown border-bison-gold/50"
      : "bg-red-100 text-red-900 border-red-200";

  const seatLabel = seatCap ? `${seats}/${seatCap} seats left` : `${seats} seats left`;
  const waitLabel = waitCap
    ? `${waitlist}/${waitCap} waitlist${waitFull ? " (full)" : ""}`
    : waitlist > 0
    ? `${waitlist} waitlist`
    : "No waitlist";

  return (
    <div className="w-40 rounded-md border border-bison-border bg-white p-2 text-left">
      <div className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded border ${statusCls}`}>
        {seatStatus === "full" ? "Class full" : seatStatus === "limited" ? "Limited seats" : "Open"}
      </div>
      <div className="mt-1 text-xs font-semibold text-bison-text">{seatLabel}</div>
      <div className={`text-[11px] ${waitFull ? "text-red-700 font-semibold" : "text-bison-text-muted"}`}>
        {waitLabel}
      </div>
      {seatStatus === "full" && waitFull ? (
        <div className="text-[11px] text-red-700 font-semibold mt-0.5">Waitlist full</div>
      ) : null}
    </div>
  );
}

