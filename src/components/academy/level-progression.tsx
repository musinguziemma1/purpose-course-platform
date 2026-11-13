import { getLevelProgression } from "@/db/level-progression";
import type { SessionUser } from "@/lib/auth";
import { LevelEnrolmentForm } from "@/components/academy/level-enrolment-form";
export async function LevelProgression({ user }: { user: SessionUser }) {
  const levels = await getLevelProgression(user);
  return (
    <section className="admin-card p-5">
      <h2 className="font-serif text-xl text-navy">Your next level</h2>
      <p className="mt-1 text-sm text-stone-600">
        Pass your level examination and complete its required learning to unlock
        the next level. Your completed courses remain available.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {levels.map((level) => (
          <div
            key={level.id}
            className={`rounded-xl border p-4 ${level.canEnroll ? "border-gold/50 bg-gold/5" : "border-navy/10"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Level {level.levelNumber}
            </p>
            <h3 className="mt-1 font-serif text-lg text-navy">{level.name}</h3>
            <p className="mt-2 text-xs text-stone-600">
              {level.completed
                ? "Level completed"
                : level.enrollmentStatus === "enrolled"
                  ? "Enrolled · ready to learn"
                  : level.enrollmentStatus === "paused"
                    ? "Paused · contact your course team"
                    : level.canEnroll
                      ? "Unlocked · you can enrol now"
                      : !level.prerequisiteMet
                        ? "Pass the previous level first"
                        : !level.available
                          ? "Teaching materials are being prepared"
                          : "Admission requires staff approval"}
            </p>
            {level.canEnroll ? (
              <LevelEnrolmentForm levelId={level.id} name={level.name} />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
