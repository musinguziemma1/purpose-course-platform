import Link from "next/link";
import { Compass, History } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getOwnPurposeProfile, getPurposeProfileHistory } from "@/db/purpose-journey";
import { PurposeProfileForm } from "@/components/learn/purpose-profile-form";
import { LeatherChip, LearnHero, Panel, btn } from "@/components/learn/kit";
import { PRINCIPLE_INFO, PRINCIPLE_KEYS } from "@/lib/purpose-journey";
import { formatDate } from "@/lib/utils";
import { FeaturePending } from "@/components/ui/feature-pending";

export const dynamic = "force-dynamic";
export const metadata = { title: "Purpose Profile" };

export default async function PurposeProfilePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [profile, history] = await Promise.all([getOwnPurposeProfile(user), getPurposeProfileHistory(user.profileId, user)]);
  if (!profile) return <FeaturePending feature="Your Purpose Profile" />;

  const initial: Record<string, string> = {
    identityStatement: profile.identityStatement ?? "", coreValues: profile.coreValues.join("\n"), strengths: profile.strengths.join("\n"),
    interests: profile.interests.join("\n"), story: profile.story ?? "", influences: profile.influences ?? "",
    purposeStatement: profile.purposeStatement ?? "", contribution: profile.contribution ?? "", skills: profile.skills.join("\n"),
    developmentAreas: profile.developmentAreas.join("\n"), developmentObjectives: profile.developmentObjectives ?? "",
    vision: profile.vision ?? "", careerDirection: profile.careerDirection ?? "", impactAspirations: profile.impactAspirations ?? "",
  };
  const statements = history.filter((entry) => entry.purposeStatement);

  return (
    <div className="space-y-7">
      <LearnHero
        eyebrow="Purpose Profile"
        title="Who you are, and where you are going"
        description="Your Purpose Profile grows with you. Save as often as you like; each version is kept so you can see how your understanding develops."
        meta={
          <>
            <LeatherChip>Version {profile.version}</LeatherChip>
            <LeatherChip>{profile.sharedWithMentor ? "Shared with your mentor" : "Private to you"}</LeatherChip>
          </>
        }
        actions={
          <Link href="/learn/journey" className={btn.paper}>
            <Compass aria-hidden className="h-4 w-4" /> View my journey
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[13rem_1fr_19rem] xl:items-start">
        {/* Index tabs down the side of the binder, coloured by principle. */}
        <nav aria-label="Profile sections" className="hidden xl:sticky xl:top-24 xl:block">
          <ol className="space-y-2">
            {PRINCIPLE_KEYS.map((key) => (
              <li key={key}>
                <a
                  href={`#principle-${key}`}
                  className="lk-paper lk-lift relative flex min-h-11 items-center gap-2.5 overflow-hidden rounded-[10px] py-2 pl-5 pr-3 text-[14px] font-medium text-navy"
                >
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: PRINCIPLE_INFO[key].color }} />
                  {PRINCIPLE_INFO[key].name}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <PurposeProfileForm profileId={user.profileId} initial={initial} version={profile.version} sharedWithMentor={profile.sharedWithMentor} />

        <Panel title="How your purpose has evolved" icon={History} className="xl:sticky xl:top-24">
          {statements.length ? (
            <ol className="relative space-y-5 pl-6 before:absolute before:inset-y-1 before:left-[7px] before:w-px before:bg-[rgba(165,129,26,0.45)]">
              {statements.slice(0, 6).map((entry) => (
                <li key={entry.version} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-6 top-0.5 h-[15px] w-[15px] rounded-full border border-[#7a5d0d] bg-[radial-gradient(circle_at_35%_30%,#fff4c8,#c9a227_60%,#8f6f12)] shadow-[0_1px_2px_rgba(10,26,48,0.35)]"
                  />
                  <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">
                    Version {entry.version} · {formatDate(entry.createdAt)}
                  </p>
                  <p className="mt-1 font-serif text-[15px] italic leading-relaxed text-navy">“{entry.purposeStatement}”</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] text-stone-600">Once you save a purpose statement, each version appears here so you can see how your clarity grows.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
