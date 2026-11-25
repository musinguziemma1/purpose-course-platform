import Link from "next/link";
import { Compass, Fingerprint, Route, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getPurposeJourney } from "@/db/purpose-journey";
import { JourneyStages, NextSteps, PrincipleProgress } from "@/components/learn/purpose-journey-view";
import { BrassDial, LearnHero, Panel, btn } from "@/components/learn/kit";
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
    <div className="space-y-7">
      <LearnHero
        eyebrow="Identity → Source → Purpose → Potential → Destiny"
        title="Your Purpose Journey"
        description="An evolving record of how you are developing, not just which lessons you finished. Each principle draws on your learning, assessments, reflections and Purpose Profile."
        meta={journey.profileUpdatedAt ? <span className="text-[13px] text-paper/70">Profile last updated {formatDate(journey.profileUpdatedAt)}.</span> : null}
        actions={
          <Link href="/learn/profile" className={btn.brass}>
            <Fingerprint aria-hidden className="h-4 w-4" /> {journey.profileStarted ? "Update Purpose Profile" : "Start Purpose Profile"}
          </Link>
        }
        aside={<BrassDial value={journey.overall} label="Overall development" caption="Average of the five principles" size={168} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_23rem] xl:items-start">
        <Panel title="The five principles" icon={Compass} stacked>
          <p className="text-[14px] leading-relaxed text-stone-600">
            Learning counts for 40%, your Purpose Profile 25%, assessments 20% and reflections 15%. A part that does not apply to you yet is left out rather than scored as zero.
          </p>
          <div className="mt-6">
            <PrincipleProgress principles={journey.principles} detailed variant="learn" />
          </div>
        </Panel>

        <Panel title="Recommended next steps" icon={Sparkles} className="xl:sticky xl:top-24">
          <p className="text-[13px] text-stone-600">Chosen from the principle where you have the most room to grow.</p>
          <div className="mt-4">
            <NextSteps items={journey.recommendations} variant="learn" />
          </div>
        </Panel>
      </div>

      <Panel title="From vision to impact" icon={Route}>
        <p className="text-[14px] text-stone-600">Understanding becomes development when it turns into a vision, goals, visible action and impact.</p>
        <div className="mt-5">
          <JourneyStages stages={journey.stages} variant="learn" />
        </div>
      </Panel>
    </div>
  );
}
