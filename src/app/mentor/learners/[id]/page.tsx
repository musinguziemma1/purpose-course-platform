import { notFound } from "next/navigation";
import { Compass, Lock, Milestone, NotebookPen } from "lucide-react";
import type { CSSProperties } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { canReadLearner } from "@/db/learner-access";
import { getPurposeJourney, getSharedPurposeProfile } from "@/db/purpose-journey";
import { JourneyStages, OverallDevelopment, PrincipleProgress } from "@/components/learn/purpose-journey-view";
import { PRINCIPLE_INFO } from "@/lib/purpose-journey";
import { formatDate } from "@/lib/utils";
import { FeaturePending } from "@/components/ui/feature-pending";
import { DeskHero, DeskSheet, LeatherChip, Seal, SheetHead, rise, tilt } from "@/components/mentor/desk";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learner journey" };

type Params = { params: Promise<{ id: string }> };

function ProfileItem({ label, value }: { label: string; value: string | string[] | null }) {
  const text = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div>
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-stone-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-[14px] leading-relaxed text-navy">
        {text || <span className="font-serif italic text-stone-500">Not written yet</span>}
      </dd>
    </div>
  );
}

export default async function MentorLearnerJourneyPage({ params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || !(await canReadLearner(id, user))) notFound();
  const [[learner], journey, shared] = await Promise.all([
    db.select({ fullName: profiles.fullName, title: profiles.title }).from(profiles).where(eq(profiles.id, id)).limit(1),
    getPurposeJourney(id, user),
    getSharedPurposeProfile(id, user),
  ]);
  if (!learner) notFound();
  if (!journey) return <FeaturePending feature="The learner Purpose Journey" staff />;
  const profile = shared.profile;

  return (
    <div className="space-y-7">
      <DeskHero
        compact
        back={{ href: "/mentor/learners", label: "All learners" }}
        lead={<Seal name={learner.fullName} size="xl" />}
        eyebrow="Learner development"
        title={learner.fullName}
        description={learner.title ?? "Learner"}
        meta={
          <>
            <LeatherChip tone="teal">{journey.overall}% overall development</LeatherChip>
            {journey.profileUpdatedAt ? <LeatherChip>Profile updated {formatDate(journey.profileUpdatedAt)}</LeatherChip> : null}
            <LeatherChip tone={profile ? "green" : undefined}>{profile ? "Profile shared" : "Profile private"}</LeatherChip>
          </>
        }
      />

      <div className="grid gap-7 xl:grid-cols-[1fr_20rem]">
        <DeskSheet className="desk-rise overflow-hidden" style={rise(1)} labelledBy="learner-principles">
          <SheetHead id="learner-principles" eyebrow="Five principles" title="Purpose Journey" icon={Compass} tone="teal" />
          <div className="px-5 pb-6 pt-4 sm:px-6">
            <p className="text-[14px] text-stone-600">Progress across the five principles from learning, assessments, reflections and the Purpose Profile.</p>
            <div className="mt-5">
              <PrincipleProgress principles={journey.principles} detailed />
            </div>
          </div>
        </DeskSheet>
        <DeskSheet as="aside" className="desk-rise p-5 sm:p-6" style={rise(2)}>
          <OverallDevelopment value={journey.overall} />
        </DeskSheet>
      </div>

      <DeskSheet className="desk-rise overflow-hidden" style={rise(3)} labelledBy="learner-stages">
        <SheetHead id="learner-stages" eyebrow="Stages" title="From vision to impact" icon={Milestone} tone="navy" />
        <div className="px-5 pb-6 pt-5 sm:px-6">
          <JourneyStages stages={journey.stages} />
        </div>
      </DeskSheet>

      <section aria-labelledby="learner-profile" className="desk-rise" style={rise(4)}>
        <div className="mb-5 flex items-center gap-3">
          <span className="desk-enamel" data-tone="gold">
            <NotebookPen aria-hidden className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Card file</p>
            <h2 id="learner-profile" className="desk-letterpress font-serif text-[1.3rem] leading-tight">
              Purpose Profile
            </h2>
          </div>
        </div>
        {profile ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {(
              [
                ["identity", [["Identity statement", profile.identityStatement], ["Core values", profile.coreValues], ["Strengths", profile.strengths], ["Interests", profile.interests]]],
                ["source", [["Story", profile.story], ["Influences", profile.influences]]],
                ["purpose", [["Purpose statement", profile.purposeStatement], ["Contribution", profile.contribution]]],
                ["potential", [["Skills", profile.skills], ["Areas for development", profile.developmentAreas], ["Development objectives", profile.developmentObjectives]]],
                ["destiny", [["Vision", profile.vision], ["Career or life direction", profile.careerDirection], ["Impact aspirations", profile.impactAspirations]]],
              ] as const
            ).map(([key, items], index) => (
              <div
                key={key}
                className="desk-index p-5"
                data-band=""
                style={{ ...tilt(index, 0.5), "--band": PRINCIPLE_INFO[key].color } as CSSProperties}
              >
                <h3 className="flex items-center gap-2 font-serif text-lg text-navy">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRINCIPLE_INFO[key].color }} /> {PRINCIPLE_INFO[key].name}
                </h3>
                <dl className="mt-3 space-y-3">
                  {items.map(([label, value]) => (
                    <ProfileItem key={label} label={label} value={value} />
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <div className="desk-note" data-tone="teal" style={{ "--tilt": "-0.6deg" } as CSSProperties}>
            <p className="flex items-start gap-2 text-[14px] leading-relaxed">
              <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {shared.reason === "not-shared"
                ? "This learner has not shared their written Purpose Profile. Their progress above is always visible to you; invite them to share the profile if it would help your next coaching session."
                : "The written Purpose Profile is not available."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
