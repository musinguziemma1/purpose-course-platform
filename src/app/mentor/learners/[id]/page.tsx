import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { canReadLearner } from "@/db/learner-access";
import { getPurposeJourney, getSharedPurposeProfile } from "@/db/purpose-journey";
import { PageHeader } from "@/components/ui/card";
import { JourneyStages, OverallDevelopment, PrincipleProgress } from "@/components/learn/purpose-journey-view";
import { PRINCIPLE_INFO } from "@/lib/purpose-journey";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learner journey" };

type Params = { params: Promise<{ id: string }> };

function ProfileItem({ label, value }: { label: string; value: string | string[] | null }) {
  const text = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div>
      <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-stone-600">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-[14px] leading-relaxed text-navy">{text || <span className="text-stone-500">Not written yet</span>}</dd>
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
  if (!learner || !journey) notFound();
  const profile = shared.profile;

  return (
    <div className="space-y-6">
      <Link href="/mentor/learners" className="inline-flex min-h-10 items-center gap-1.5 text-[14px] text-stone-600 hover:text-navy">
        <ArrowLeft aria-hidden className="h-4 w-4" /> All learners
      </Link>
      <PageHeader eyebrow="Learner development" title={learner.fullName} description={learner.title ?? "Learner"} />

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section aria-labelledby="learner-principles" className="admin-card p-5 sm:p-6">
          <h2 id="learner-principles" className="font-serif text-2xl text-navy">Purpose Journey</h2>
          <p className="mt-1 text-[14px] text-stone-600">Progress across the five principles from learning, assessments, reflections and the Purpose Profile.</p>
          <div className="mt-5"><PrincipleProgress principles={journey.principles} detailed /></div>
        </section>
        <aside className="admin-card p-5 sm:p-6">
          <OverallDevelopment value={journey.overall} />
          {journey.profileUpdatedAt ? <p className="mt-3 text-[13px] text-stone-600">Profile updated {formatDate(journey.profileUpdatedAt)}.</p> : null}
        </aside>
      </div>

      <section aria-labelledby="learner-stages" className="admin-card p-5 sm:p-6">
        <h2 id="learner-stages" className="font-serif text-2xl text-navy">From vision to impact</h2>
        <div className="mt-4"><JourneyStages stages={journey.stages} /></div>
      </section>

      <section aria-labelledby="learner-profile" className="admin-card p-5 sm:p-6">
        <h2 id="learner-profile" className="font-serif text-2xl text-navy">Purpose Profile</h2>
        {profile ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {([
              ["identity", [["Identity statement", profile.identityStatement], ["Core values", profile.coreValues], ["Strengths", profile.strengths], ["Interests", profile.interests]]],
              ["source", [["Story", profile.story], ["Influences", profile.influences]]],
              ["purpose", [["Purpose statement", profile.purposeStatement], ["Contribution", profile.contribution]]],
              ["potential", [["Skills", profile.skills], ["Areas for development", profile.developmentAreas], ["Development objectives", profile.developmentObjectives]]],
              ["destiny", [["Vision", profile.vision], ["Career or life direction", profile.careerDirection], ["Impact aspirations", profile.impactAspirations]]],
            ] as const).map(([key, items]) => (
              <div key={key} className="rounded-xl border border-navy/10 p-4">
                <h3 className="flex items-center gap-2 font-serif text-lg text-navy">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRINCIPLE_INFO[key].color }} /> {PRINCIPLE_INFO[key].name}
                </h3>
                <dl className="mt-3 space-y-3">
                  {items.map(([label, value]) => <ProfileItem key={label} label={label} value={value} />)}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-cream/60 p-4 text-[14px] text-stone-700">
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
            {shared.reason === "not-shared"
              ? "This learner has not shared their written Purpose Profile. Their progress above is always visible to you; invite them to share the profile if it would help your next coaching session."
              : "The written Purpose Profile is not available."}
          </p>
        )}
      </section>
    </div>
  );
}
