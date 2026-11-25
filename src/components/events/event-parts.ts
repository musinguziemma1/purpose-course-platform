import { localEventTime, validTimeZone } from "@/lib/event-time";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  class: "Class",
  group_work: "Group work",
  discussion: "Discussion",
  office_hours: "Office hours",
};

export function eventTypeLabel(type: string) {
  return EVENT_TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

/**
 * Wall-clock pieces of an event in its own time zone. Built from numeric parts and fixed
 * English names so the server and the browser always render the same text.
 */
export function eventParts(startsAt: string | Date, durationMinutes: number, timezone: string) {
  const zone = validTimeZone(timezone) ? timezone : "Africa/Kampala";
  const start = new Date(startsAt);
  const [date, time] = localEventTime(start, zone).split("T");
  const [year, month, day] = date.split("-").map(Number);
  const end = localEventTime(new Date(start.getTime() + durationMinutes * 60_000), zone).split("T")[1];
  return {
    zone,
    year,
    day,
    month,
    monthName: MONTHS[month - 1],
    monthKey: date.slice(0, 7),
    weekday: WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    start: time,
    end,
  };
}

export type EventParts = ReturnType<typeof eventParts>;
