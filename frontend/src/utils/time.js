export function toMinutes(hhmm) {
  const raw = String(hhmm || "").padStart(4, "0");
  if (!/^\d{4}$/.test(raw)) return null;
  const hh = Number(raw.slice(0, 2));
  const mm = Number(raw.slice(2));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

export function formatHhmmAmPm(hhmm) {
  if (!hhmm || String(hhmm).length < 3) return "";
  const raw = String(hhmm).padStart(4, "0");
  const hh = Number(raw.slice(0, 2));
  const mm = raw.slice(2);
  const suffix = hh >= 12 ? "PM" : "AM";
  const twelve = hh % 12 === 0 ? 12 : hh % 12;
  return `${twelve}:${mm} ${suffix}`;
}

export function formatMinutesAmPm(totalMinutes) {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  const suffix = hh >= 12 ? "PM" : "AM";
  const normalized = hh % 12 === 0 ? 12 : hh % 12;
  return `${normalized}:${String(mm).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRangeFromMinutes(start, end) {
  return `${formatMinutesAmPm(start)}–${formatMinutesAmPm(end)}`;
}

export function formatTimeRangeFromHhmm(start, end) {
  return `${formatHhmmAmPm(start)} - ${formatHhmmAmPm(end)}`.trim();
}
