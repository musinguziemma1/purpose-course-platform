"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  saveCohort,
  saveCohortMember,
  saveEnrolment,
  type CohortState,
} from "@/app/actions/cohort-enrolments";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
function Note({ state }: { state: CohortState }) {
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
      {state.id ? (
        <Link
          href={`/admin/cohorts/${state.id}`}
          className="ml-2 font-semibold underline"
        >
          Manage cohort
        </Link>
      ) : null}
    </p>
  ) : null;
}
type CohortData = {
  id: number;
  name: string;
  description: string;
  levelId: number | null;
  courseId: number | null;
  capacity: number;
  startsAt: string;
  endsAt: string;
  cadence: string;
  status: string;
  updatedAt: string;
};
export function CohortSetupForm({
  levels,
  courses = [],
  cohort,
}: {
  levels: { id: number; name: string }[];
  courses?: { id: number; title: string; levelId: number | null }[];
  cohort?: CohortData;
}) {
  const [state, action, pending] = useActionState<CohortState, FormData>(
    saveCohort,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        {cohort ? (
          <>
            <input type="hidden" name="cohortId" value={cohort.id} />
            <input type="hidden" name="version" value={cohort.updatedAt} />
          </>
        ) : null}
        <Field label="Cohort name">
          <Input
            name="name"
            required
            minLength={6}
            maxLength={180}
            defaultValue={cohort?.name}
          />
        </Field>
        <Field label="Cohort description">
          <Textarea
            name="description"
            required
            minLength={30}
            maxLength={10000}
            rows={3}
            defaultValue={cohort?.description}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cohort starts">
            <Input
              name="startsAt"
              type="date"
              required
              defaultValue={cohort?.startsAt.slice(0, 10)}
            />
          </Field>
          <Field label="Cohort ends">
            <Input
              name="endsAt"
              type="date"
              required
              defaultValue={cohort?.endsAt.slice(0, 10)}
            />
          </Field>
        </div>
        <Field label="Course level">
          <Select name="levelId" required defaultValue={cohort?.levelId ?? ""}>
            <option value="">Choose level</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Specific course" hint="optional">
          <Select name="courseId" defaultValue={cohort?.courseId ?? ""}>
            <option value="">All courses in this level</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Learner capacity">
            <Input
              name="capacity"
              type="number"
              min={1}
              max={10000}
              required
              defaultValue={cohort?.capacity ?? 50}
            />
          </Field>
          <Field label="Cohort status">
            <Select name="status" defaultValue={cohort?.status ?? "draft"}>
              {["draft", "active", "completed", "cancelled"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Meeting cadence">
          <Input
            name="cadence"
            maxLength={120}
            defaultValue={cohort?.cadence ?? "Weekly live class and reflection"}
          />
        </Field>
        {!cohort ? (
          <Field label="Week plan" hint="one per line: Title | Theme">
            <Textarea
              name="weeks"
              rows={4}
              placeholder={
                "Identity | Identity\nPurpose | Purpose\nLearning in practice | Potential"
              }
            />
          </Field>
        ) : null}
        <p className="text-xs leading-relaxed text-stone-500">
          A draft can be prepared before activation. Completed and cancelled
          cohorts stay closed. Cancelling a cohort also cancels its remaining
          live sessions.
        </p>
        <Note state={state} />
        <button
          disabled={pending}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : cohort
              ? "Save cohort settings"
              : "Create cohort"}
        </button>
      </fieldset>
    </form>
  );
}
export function CohortMemberForm({
  cohortId,
  people,
}: {
  cohortId: number;
  people: { id: string; name: string; role: string }[];
}) {
  const [state, action, pending] = useActionState<CohortState, FormData>(
    saveCohortMember,
    {},
  );
  return (
    <form action={action} className="space-y-3">
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <input type="hidden" name="cohortId" value={cohortId} />
        <input type="hidden" name="status" value="active" />
        <Field label="Account to place">
          <Select name="profileId" required defaultValue="">
            <option value="">Choose an active account</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.role}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Membership role">
          <Select name="role" defaultValue="learner">
            <option value="learner">Learner</option>
            <option value="mentor">Mentor</option>
            <option value="facilitator">Facilitator</option>
          </Select>
        </Field>
        <p className="text-xs text-stone-500">
          Learners need approved enrolment in this level. Placement transfers
          them from any other cohort in the same level and preserves learning
          progress.
        </p>
        <Note state={state} />
        <button
          disabled={pending}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          Add or transfer member
        </button>
      </fieldset>
    </form>
  );
}
export function CohortMembershipControl({
  cohortId,
  profileId,
  role,
  status,
}: {
  cohortId: number;
  profileId: string;
  role: string;
  status: string;
}) {
  const [state, action, pending] = useActionState<CohortState, FormData>(
    saveCohortMember,
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="cohortId" value={cohortId} />
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="role" value={role} />
      <input
        type="hidden"
        name="status"
        value={status === "active" ? "removed" : "active"}
      />
      <button
        disabled={pending}
        className="rounded-full border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-50"
      >
        {status === "active" ? "Remove membership" : "Restore membership"}
      </button>
      <Note state={state} />
    </form>
  );
}
export function EnrolmentForm({
  record,
  cohorts,
}: {
  record: {
    id: string;
    status: string;
    cohortId: number | null;
    notes: string | null;
    updatedAt: string;
  };
  cohorts: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState<CohortState, FormData>(
    saveEnrolment,
    {},
  );
  return (
    <form action={action} className="mt-4 space-y-3">
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        <input type="hidden" name="enrolmentId" value={record.id} />
        <input type="hidden" name="version" value={record.updatedAt} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Enrolment status">
            <Select name="status" defaultValue={record.status}>
              {["waitlist", "enrolled", "paused", "completed"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Enrolment cohort">
            <Select name="cohortId" defaultValue={record.cohortId ?? ""}>
              <option value="">No cohort placement</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Internal enrolment notes">
          <Textarea
            name="notes"
            rows={2}
            maxLength={4000}
            defaultValue={record.notes ?? ""}
          />
        </Field>
        <Note state={state} />
        <button
          disabled={pending}
          className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
        >
          Save enrolment
        </button>
      </fieldset>
    </form>
  );
}
