import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getPurposeJourney } from "@/db/purpose-journey";
import { PageHeader } from "@/components/ui/card";
import { JourneyStages, NextSteps, OverallDevelopment, PrincipleProgress } from "@/components/learn/purpose-journey-view";
import { formatDate } from "@/lib/utils";
import { FeaturePending } from "@/components/ui/feature-pending";

export const dynamic = "force-dynamic";
export const metadata = { title: "Purpose Journey" };

export default async function PurposeJourneyPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const journey = await getPurposeJourney(user.profileId, user);
  if (!journey) return <FeaturePending feature="Your Purpose Journey" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Identity → Source → Purpose → Potential → Destiny"
        title="Your Purpose Journey"
        description="An evolving record of how you are developing, not just which lessons you finished. Each principle draws on your learning, assessments, reflections and Purpose Profile."
        actions={
          <Link href="/learn/profile" className="inline-flex h-11 items-center gap-2 rounded-full bg-navy px-5 text-[14px] font-semibold text-paper transition-[transform,background-color] duration-150 hover:bg-navy-700 active:scale-[0.97]">
            <Fingerprint aria-hidden className="h-4 w-4" /> {journey.profileStarted ? "Update Purpose Profile" : "Start Purpose Profile"}
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <section aria-labelledby="principles-heading" className="admin-card p-5 sm:p-6">
          <h2 id="principles-heading" className="font-serif text-2xl text-navy">The five principles</h2>
          <p className="mt-1 text-[14px] text-stone-600">
            Learning counts for 40%, your Purpose Profile 25%, assessments 20% and reflections 15%. A part that does not apply to you yet is left out rather than scored as zero.
          </p>
          <div className="mt-6"><PrincipleProgress principles={journey.principles} detailed /></div>
        </section>

        <aside className="space-y-6">
          <section className="admin-card p-5 sm:p-6">
            <OverallDevelopment value={journey.overall} />
            {journey.profileUpdatedAt ? <p className="mt-3 text-[13px] text-stone-600">Profile last updated {formatDate(journey.profileUpdatedAt)}.</p> : null}
          </section>
          <section aria-labelledby="next-heading" className="admin-card p-5 sm:p-6">
            <h2 id="next-heading" className="font-serif text-xl text-navy">Recommended next steps</h2>
            <p className="mt-1 text-[13px] text-stone-600">Chosen from the principle where you have the most room to grow.</p>
            <div className="mt-3"><NextSteps items={journey.recommendations} /></div>
          </section>
        </aside>
      </div>

      <section aria-labelledby="stages-heading" className="admin-card p-5 sm:p-6">
        <h2 id="stages-heading" className="font-serif text-2xl text-navy">From vision to impact</h2>
        <p className="mt-1 text-[14px] text-stone-600">Understanding becomes development when it turns into a vision, goals, visible action and impact.</p>
        <div className="mt-5"><JourneyStages stages={journey.stages} /></div>
      </section>
    </div>
  );
}
