"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  changeLiveEventStatus,
  requestLiveEvent,
  reviewLiveEventRequest,
  scheduleLiveEvent,
  setEventRsvp,
  type LiveInput,
} from "@/db/live-events";
export type EventState = {
  ok?: boolean;
  error?: string;
  message?: string;
  id?: number;
};
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export async function refreshLiveEvents() {
  for (const path of [
    "/events",
    "/",
    "/course",
    "/learn",
    "/learn/live",
    "/mentor",
    "/mentor/live",
    "/admin",
    "/admin/academy/live",
    "/learn/cohort",
  ])
    revalidatePath(path);
  revalidatePath("/events/[id]", "page");
}
function input(form: FormData): LiveInput {
  return {
    id: Number(form.get("id")) || undefined,
    version: text(form, "version"),
    scheduleKey: text(form, "scheduleKey"),
    title: text(form, "title"),
    description: text(form, "description"),
    agenda: text(form, "agenda"),
    type: text(form, "type"),
    startsAt: text(form, "startsAt"),
    timezone: text(form, "timezone"),
    durationMinutes: Number(form.get("durationMinutes")),
    hostId: text(form, "hostId"),
    courseId: Number(form.get("courseId")) || null,
    cohortId: Number(form.get("cohortId")) || null,
    meetingUrl: text(form, "meetingUrl"),
    isPublic: form.get("isPublic") === "on",
    groupSize: Number(form.get("groupSize")) || null,
  };
}
export async function saveEvent(
  _prev: EventState,
  form: FormData,
): Promise<EventState> {
  const result = await scheduleLiveEvent(input(form), await getSessionUser());
  if ("ok" in result && result.ok) await refreshLiveEvents();
  return result;
}
export async function requestEvent(
  _prev: EventState,
  form: FormData,
): Promise<EventState> {
  const result = await requestLiveEvent(input(form), await getSessionUser());
  if ("ok" in result && result.ok) await refreshLiveEvents();
  return result;
}
export async function reviewEventRequest(
  _prev: EventState,
  form: FormData,
): Promise<EventState> {
  const result = await reviewLiveEventRequest(
    {
      id: text(form, "requestId"),
      version: text(form, "version"),
      decision: text(form, "decision"),
      note: text(form, "note"),
    },
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) await refreshLiveEvents();
  return result;
}
export async function changeEventStatus(
  _prev: EventState,
  form: FormData,
): Promise<EventState> {
  const result = await changeLiveEventStatus(
    {
      id: Number(form.get("sessionId")),
      version: text(form, "version"),
      status: text(form, "status"),
    },
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) {
    await refreshLiveEvents();
    revalidatePath(`/learn/live/${form.get("sessionId")}`);
    revalidatePath(`/mentor/live/${form.get("sessionId")}`);
  }
  return result;
}
export async function saveEventRsvp(
  _prev: EventState,
  form: FormData,
): Promise<EventState> {
  const result = await setEventRsvp(
    Number(form.get("sessionId")),
    form.get("going") === "true",
    await getSessionUser(),
  );
  if ("ok" in result && result.ok) await refreshLiveEvents();
  return result;
}
