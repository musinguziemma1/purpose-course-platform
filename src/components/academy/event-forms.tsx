"use client";
import { useActionState, useState } from "react";
import {
  saveEvent,
  requestEvent,
  reviewEventRequest,
  changeEventStatus,
  saveEventRsvp,
  type EventState,
} from "@/app/actions/live-events";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { localEventTime, zonedDateTime } from "@/lib/event-time";
export function EventNote({ state }: { state: EventState }) {
  return state.error ? (
    <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
      {state.error}
    </p>
  ) : state.ok ? (
    <p
      role="status"
      className="rounded-lg bg-source/10 p-3 text-sm text-source"
    >
      {state.message}
    </p>
  ) : null;
}
export type EventOptions = {
  courses: { id: number; title: string }[];
  cohorts: { id: number; name: string; levelId: number | null }[];
  hosts: { id: string; fullName: string }[];
};
type Existing = {
  id: number;
  title: string;
  description: string | null;
  agenda: string | null;
  type: string;
  startsAt: string;
  timezone: string;
  durationMinutes: number;
  hostId: string | null;
  courseId: number | null;
  cohortId: number | null;
  meetingUrl: string | null;
  isPublic: boolean;
  updatedAt: string;
};
export function EventForm({
  options,
  request = false,
  hostId,
  timezone = "Africa/Kampala",
  existing,
}: {
  options: EventOptions;
  request?: boolean;
  hostId?: string;
  timezone?: string;
  existing?: Existing;
}) {
  const [key] = useState(() => crypto.randomUUID()),
    [zone, setZone] = useState(existing?.timezone ?? timezone),
    [start] = useState(() =>
      localEventTime(
        existing?.startsAt ?? new Date(Date.now() + 86400000),
        zone,
      ),
    );
  const [state, action, pending] = useActionState<EventState, FormData>(
    async (prev, form) => {
      const converted = zonedDateTime(
        String(form.get("localStart")),
        String(form.get("timezone")),
      );
      if (!converted)
        return {
          error:
            "Choose a valid date and time in this time zone. Some clock changes skip local times.",
        };
      form.set("startsAt", converted);
      return (request ? requestEvent : saveEvent)(prev, form);
    },
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <input type="hidden" name="scheduleKey" value={key} />
        {existing ? (
          <>
            <input type="hidden" name="id" value={existing.id} />
            <input type="hidden" name="version" value={existing.updatedAt} />
          </>
        ) : null}
        <Field label="Session title">
          <Input
            name="title"
            required
            minLength={4}
            maxLength={220}
            defaultValue={existing?.title}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Session type">
            <Select name="type" defaultValue={existing?.type ?? "class"}>
              <option value="class">Live class</option>
              <option value="group_work">Group work</option>
              <option value="discussion">Discussion</option>
              <option value="office_hours">Office hours</option>
            </Select>
          </Field>
          {request ? (
            <input type="hidden" name="hostId" value={hostId} />
          ) : (
            <Field label="Session host">
              <Select
                name="hostId"
                required
                defaultValue={existing?.hostId ?? hostId ?? ""}
              >
                <option value="">Choose faculty</option>
                {options.hosts.map((host) => (
                  <option key={host.id} value={host.id}>
                    {host.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Session starts">
            <Input
              type="datetime-local"
              name="localStart"
              required
              defaultValue={start}
            />
          </Field>
          <Field label="Time zone">
            <Input
              name="timezone"
              required
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Africa/Kampala"
            />
          </Field>
        </div>
        <Field label="Duration in minutes">
          <Input
            type="number"
            name="durationMinutes"
            min={15}
            max={480}
            required
            defaultValue={existing?.durationMinutes ?? 60}
          />
        </Field>
        <Field label="Course scope">
          <Select name="courseId" defaultValue={existing?.courseId ?? ""}>
            <option value="">All account holders</option>
            {options.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cohort scope">
          <Select name="cohortId" defaultValue={existing?.cohortId ?? ""}>
            <option value="">No cohort restriction</option>
            {options.cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Session description">
          <Textarea
            name="description"
            required
            minLength={20}
            maxLength={10000}
            rows={3}
            defaultValue={existing?.description ?? ""}
          />
        </Field>
        <p className="text-xs text-stone-500">
          The title, description, host and schedule appear in account event
          calendars. Public events also appear on the website. Room links and
          agendas remain protected.
        </p>
        <Field label="Agenda and preparation">
          <Textarea
            name="agenda"
            rows={3}
            maxLength={10000}
            defaultValue={existing?.agenda ?? ""}
          />
        </Field>
        {!request ? (
          <>
            <Field
              label="External meeting link"
              hint="optional; otherwise use the built-in room"
            >
              <Input
                name="meetingUrl"
                type="url"
                placeholder="https://meet.google.com/…"
                defaultValue={existing?.meetingUrl ?? ""}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input
                name="isPublic"
                type="checkbox"
                defaultChecked={existing?.isPublic ?? true}
              />
              Show event details on public website
            </label>
          </>
        ) : null}
        <EventNote state={state} />
        <button
          disabled={pending}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : request
              ? "Request a live session"
              : existing
                ? "Save session changes"
                : "Schedule session"}
        </button>
      </fieldset>
    </form>
  );
}
export function RequestReviewForm({
  id,
  version,
  own = false,
}: {
  id: string;
  version: string;
  own?: boolean;
}) {
  const [state, action, pending] = useActionState<EventState, FormData>(
    reviewEventRequest,
    {},
  );
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="requestId" value={id} />
      <input type="hidden" name="version" value={version} />
      {!own ? (
        <Field label="Scheduling decision note">
          <Textarea
            name="note"
            maxLength={2000}
            rows={2}
            placeholder="Explain a decline or add a note for the host."
          />
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {(own ? ["withdraw"] : ["approve", "decline"]).map((decision) => (
          <button
            key={decision}
            name="decision"
            value={decision}
            disabled={pending}
            className="rounded-full border border-navy/20 px-4 py-2 text-sm font-semibold capitalize text-navy disabled:opacity-50"
          >
            {decision === "approve"
              ? "Approve and schedule"
              : decision === "withdraw"
                ? "Withdraw request"
                : "Decline request"}
          </button>
        ))}
      </div>
      <EventNote state={state} />
    </form>
  );
}
export function EventStatusForm({
  id,
  version,
  status,
}: {
  id: number;
  version: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<EventState, FormData>(
    changeEventStatus,
    {},
  );
  const next =
    status === "scheduled"
      ? ["live", "cancelled"]
      : status === "live"
        ? ["ended", "cancelled"]
        : [];
  return next.length ? (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="sessionId" value={id} />
      <input type="hidden" name="version" value={version} />
      <div className="flex flex-wrap gap-2">
        {next.map((value) => (
          <button
            key={value}
            name="status"
            value={value}
            disabled={pending}
            className={`rounded-full border px-4 py-2 text-xs font-semibold disabled:opacity-50 ${value === "cancelled" ? "border-rose-200 text-rose-700" : "border-navy/20 text-navy"}`}
          >
            {value === "live"
              ? "Start session"
              : value === "ended"
                ? "End session"
                : "Cancel session"}
          </button>
        ))}
      </div>
      <EventNote state={state} />
    </form>
  ) : null;
}
export function EventRsvpForm({ id, going }: { id: number; going: boolean }) {
  const [state, action, pending] = useActionState<EventState, FormData>(
    saveEventRsvp,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="sessionId" value={id} />
      <input type="hidden" name="going" value={String(!going)} />
      <button
        disabled={pending}
        className="rounded-full border border-navy/20 px-4 py-2 text-sm font-semibold text-navy disabled:opacity-50"
      >
        {going ? "Cancel RSVP" : "RSVP to session"}
      </button>
      <EventNote state={state} />
    </form>
  );
}
