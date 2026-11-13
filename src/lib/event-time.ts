export function validTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
function wallParts(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (key: string) => Number(parts.find((p) => p.type === key)?.value);
  return [get("year"), get("month"), get("day"), get("hour"), get("minute")];
}
export function zonedDateTime(value: string, zone: string): string | null {
  if (!validTimeZone(zone) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    return null;
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number),
    target = Date.UTC(year, month - 1, day, hour, minute);
  let instant = target;
  for (let n = 0; n < 3; n++) {
    const p = wallParts(new Date(instant), zone);
    instant += target - Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4]);
  }
  const expected = [year, month, day, hour, minute],
    actual = wallParts(new Date(instant), zone);
  return actual.every((part, i) => part === expected[i])
    ? new Date(instant).toISOString()
    : null;
}
export function localEventTime(date: Date | string, zone: string) {
  const p = wallParts(
    new Date(date),
    validTimeZone(zone) ? zone : "Africa/Kampala",
  );
  return `${p[0]}-${String(p[1]).padStart(2, "0")}-${String(p[2]).padStart(2, "0")}T${String(p[3]).padStart(2, "0")}:${String(p[4]).padStart(2, "0")}`;
}
export function eventDate(date: Date | string, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: validTimeZone(zone) ? zone : "Africa/Kampala",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
