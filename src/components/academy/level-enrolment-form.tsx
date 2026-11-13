"use client";
import { useActionState } from "react";
import {
  activateNextLevel,
  type ProgressionState,
} from "@/app/actions/level-progression";
export function LevelEnrolmentForm({
  levelId,
  name,
}: {
  levelId: number;
  name: string;
}) {
  const [state, action, pending] = useActionState<ProgressionState, FormData>(
    activateNextLevel,
    {},
  );
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="levelId" value={levelId} />
      <button
        disabled={pending || state.ok}
        className="rounded-full bg-navy px-4 py-2 text-xs font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Enrolling…" : state.ok ? "Enrolled" : `Enrol in ${name}`}
      </button>
      {state.error ? (
        <p role="alert" className="text-xs text-rose-700">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-xs text-source">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
