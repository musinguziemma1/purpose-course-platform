import Link from "next/link";
import { Compass } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getOwnPurposeProfile, getPurposeProfileHistory } from "@/db/purpose-journey";
import { PageHeader } from "@/components/ui/card";
import { PurposeProfileForm } from "@/components/learn/purpose-profile-form";
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Purpose Profile"
        title="Who you are, and where you are going"
        description="Your Purpose Profile grows with you. Save as often as you like; each version is kept so you can see how your understanding develops."
        actions={
          <Link href="/learn/journey" className="inline-flex h-11 items-center gap-2 rounded-full border border-navy/20 bg-paper px-5 text-[14px] font-semibold text-navy transition-[transform,background-color] duration-150 hover:bg-cream active:scale-[0.97]">
            <Compass aria-hidden className="h-4 w-4" /> View my journey
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[13rem_1fr_19rem] xl:items-start">
        <nav aria-label="Profile sections" className="hidden xl:sticky xl:top-24 xl:block">
          <ol className="space-y-1">
            {PRINCIPLE_KEYS.map((key) => (
              <li key={key}>
                <a href={`#principle-${key}`} className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[14px] text-navy transition-colors hover:bg-paper">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRINCIPLE_INFO[key].color }} />
                  {PRINCIPLE_INFO[key].name}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <PurposeProfileForm profileId={user.profileId} initial={initial} version={profile.version} sharedWithMentor={profile.sharedWithMentor} />

        <aside className="admin-card p-5 xl:sticky xl:top-24">
          <h2 className="font-serif text-xl text-navy">How your purpose has evolved</h2>
          {statements.length ? (
            <ol className="mt-4 space-y-4 border-l-2 border-gold/40 pl-4">
              {statements.slice(0, 6).map((entry) => (
                <li key={entry.version}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-stone-600">Version {entry.version} · {formatDate(entry.createdAt)}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-navy">“{entry.purposeStatement}”</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[14px] text-stone-600">Once you save a purpose statement, each version appears here so you can see how your clarity grows.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
