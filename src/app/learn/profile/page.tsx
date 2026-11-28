import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Briefcase, Compass, Heart, History, Lightbulb, PenLine, Shield, Target, TrendingUp, User, Users, type LucideIcon } from "lucide-react";
import { VisionBoard } from "@/components/profile/vision-board";
import { PurposeStatement } from "@/components/profile/purpose-statement";
import { PurposeProfileForm } from "@/components/learn/purpose-profile-form";
import { Panel } from "@/components/learn/kit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { ToastProvider } from "@/components/ui/toast";
import { FeaturePending } from "@/components/ui/feature-pending";
import { getSessionUser } from "@/lib/auth";
import { getOwnPurposeProfile, getPurposeJourney, getPurposeProfileHistory, type PurposeProfileRecord } from "@/db/purpose-journey";
import { getOwnLearnerRecords, type LearnerRecords } from "@/db/learner-records";
import { PRINCIPLE_INFO, goalIsDone } from "@/lib/purpose-journey";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Purpose Profile",
  description: "Your comprehensive profile including values, strengths, vision, and purpose statement.",
};

/* Same icons as getValueIcon in values-chart (a client module, so not callable from this server page). */
const VALUE_ICONS: Record<string, LucideIcon> = { integrity: Shield, growth: TrendingUp, compassion: Heart, excellence: Target, innovation: Lightbulb, community: Users };
const valueIcon = (name: string) => VALUE_ICONS[name.toLowerCase()] ?? Target;

const VALUE_COLORS = [PRINCIPLE_INFO.identity.color, PRINCIPLE_INFO.source.color, PRINCIPLE_INFO.purpose.color, PRINCIPLE_INFO.potential.color, PRINCIPLE_INFO.destiny.color];

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    notFound();
  }
  const [profile, history, records, journey] = await Promise.all([
    getOwnPurposeProfile(user),
    getPurposeProfileHistory(user.profileId, user),
    getOwnLearnerRecords(user),
    getPurposeJourney(user.profileId, user),
  ]);
  if (!profile || !records) return <FeaturePending feature="Your Purpose Profile" />;

  const initial: Record<string, string> = {
    identityStatement: profile.identityStatement ?? "", coreValues: profile.coreValues.join("\n"), strengths: profile.strengths.join("\n"),
    interests: profile.interests.join("\n"), story: profile.story ?? "", influences: profile.influences ?? "",
    purposeStatement: profile.purposeStatement ?? "", contribution: profile.contribution ?? "", skills: profile.skills.join("\n"),
    developmentAreas: profile.developmentAreas.join("\n"), developmentObjectives: profile.developmentObjectives ?? "",
    vision: profile.vision ?? "", careerDirection: profile.careerDirection ?? "", impactAspirations: profile.impactAspirations ?? "",
  };
  const statements = history.filter((entry) => entry.purposeStatement);
  const certificateCount = records.certificates.length;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gradient-to-b from-warm-ivory via-white to-warm-ivory pb-20">
        {/* Profile Header */}
        <section className="border-b border-stone-200 bg-white">
          <div className="shell py-12">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Avatar src={user.avatarUrl} fallback={user.fullName || user.email} size="xl" className="ring-4 ring-gold/20" />

              <div className="flex-1">
                <h1 className="font-serif text-3xl font-semibold text-navy sm:text-4xl">{user.fullName || "Your Profile"}</h1>
                <p className="mt-2 text-stone-600">{user.email}</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                    <User className="h-4 w-4" />
                    <span>{user.roleName || "Learner"}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                    <Award className="h-4 w-4" />
                    <span>
                      {certificateCount} {certificateCount === 1 ? "Certificate" : "Certificates"}
                    </span>
                  </div>
                  {journey ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                      <TrendingUp className="h-4 w-4" />
                      <span>{journey.overall}% Complete</span>
                    </div>
                  ) : null}
                  <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
                    <History className="h-4 w-4" />
                    <span>
                      Version {profile.version} · {profile.sharedWithMentor ? "Shared with your mentor" : "Private to you"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Content */}
        <section className="shell mt-12">
          <Tabs defaultValue="overview" className="w-full">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-serif text-3xl font-semibold text-navy">Your Purpose Profile</h2>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="values">Values</TabsTrigger>
                <TabsTrigger value="vision">Vision</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="edit">Edit profile</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-8">
              {profile.purposeStatement ? (
                <PurposeStatement initialStatement={profile.purposeStatement} editable={false} />
              ) : (
                <EmptyCard
                  title="Write your purpose statement"
                  body="Define your unique contribution and calling. Open Edit profile to draft it; every saved version is kept."
                />
              )}

              <div className="grid gap-8 lg:grid-cols-2">
                <ListCard title="Core Values" items={profile.coreValues} withIcons emptyText="Name at least three core values in Edit profile." />
                <ListCard title="Key Strengths" items={profile.strengths} emptyText="Name at least three strengths in Edit profile." />
              </div>

              <ProfileStats profile={profile} records={records} />
            </TabsContent>

            <TabsContent value="values" className="space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-8">
                <div className="mb-8">
                  <h3 className="font-serif text-2xl font-semibold text-navy">Values in Detail</h3>
                  <p className="mt-2 text-stone-600">Who you are, in your own words: the identity, values and gifts you have named.</p>
                </div>
                {profile.identityStatement ? (
                  <blockquote className="mb-8 rounded-xl border-l-4 border-gold bg-gold/5 px-6 py-4 font-serif text-lg italic leading-relaxed text-navy">
                    {profile.identityStatement}
                  </blockquote>
                ) : null}
                <div className="grid gap-8 md:grid-cols-2">
                  <ListCard title="Core Values" items={profile.coreValues} withIcons emptyText="No core values yet." bare />
                  <ListCard title="Strengths" items={profile.strengths} emptyText="No strengths yet." bare />
                  <ListCard title="Interests" items={profile.interests} emptyText="No interests yet." bare />
                  <ListCard title="Skills" items={profile.skills} emptyText="No skills yet." bare />
                  <ListCard title="Areas to develop" items={profile.developmentAreas} emptyText="No development areas yet." bare />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vision" className="space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-8">
                <VisionBoard items={visionItems(profile, records)} editable={false} />
                <p className="mt-6 text-sm text-stone-600">
                  Your vision comes from your Purpose Profile and active goals. Update it in{" "}
                  <span className="font-semibold text-navy">Edit profile</span> or on{" "}
                  <Link href="/learn/goals" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
                    your goals
                  </Link>
                  .
                </p>
              </div>
            </TabsContent>

            <TabsContent value="goals" className="space-y-6">
              <GoalsSection records={records} />
            </TabsContent>

            <TabsContent value="edit" className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1fr_19rem] xl:items-start">
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
              <Link href="/learn/journey" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy hover:text-gold-dark">
                <Compass className="h-4 w-4" aria-hidden /> View my journey
              </Link>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </ToastProvider>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
        <PenLine className="h-7 w-7 text-stone-400" aria-hidden />
      </div>
      <p className="mt-4 font-serif text-xl font-semibold text-navy">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-600">{body}</p>
    </div>
  );
}

/** A named list from the Purpose Profile. Values get the matching icon; no invented scores. */
function ListCard({ title, items, emptyText, withIcons = false, bare = false }: { title: string; items: string[]; emptyText: string; withIcons?: boolean; bare?: boolean }) {
  const named = items.map((item) => item.trim()).filter(Boolean);
  return (
    <div className={bare ? "" : "rounded-2xl border border-stone-200 bg-white p-6"}>
      <h3 className={bare ? "mb-4 font-serif text-xl font-semibold text-navy" : "mb-6 font-serif text-2xl font-semibold text-navy"}>{title}</h3>
      {named.length ? (
        <ul className="flex flex-wrap gap-2.5">
          {named.map((item, index) => {
            const Icon = withIcons ? valueIcon(item) : null;
            const color = VALUE_COLORS[index % VALUE_COLORS.length];
            return (
              <li
                key={`${item}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: `${color}33`, backgroundColor: `${color}0d`, color }}
              >
                {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
                {item}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">{emptyText}</p>
      )}
    </div>
  );
}

function ProfileStats({ profile, records }: { profile: PurposeProfileRecord; records: LearnerRecords }) {
  const activeGoals = records.goals.filter((goal) => goal.status === "active" && !goalIsDone(goal)).length;
  const stats = [
    { icon: Target, label: "Active Goals", value: activeGoals, color: "from-blue-500 to-blue-600" },
    { icon: Heart, label: "Reflections", value: records.reflectionCount, color: "from-pink-500 to-pink-600" },
    { icon: Briefcase, label: "Skills Named", value: profile.skills.filter((skill) => skill.trim()).length, color: "from-purple-500 to-purple-600" },
    { icon: Award, label: "Certificates", value: records.certificates.length, color: "from-green-500 to-green-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6">
            <div className={`inline-flex rounded-xl bg-gradient-to-br ${stat.color} p-3`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <p className="mt-4 text-sm font-medium text-stone-500">{stat.label}</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-navy">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}

/** Vision cards from the profile's own words and the learner's active goals. */
function visionItems(profile: PurposeProfileRecord, records: LearnerRecords) {
  const items: { id: string; title: string; description?: string; category: "career" | "personal" | "impact"; targetDate?: Date }[] = [];
  if (profile.vision) items.push({ id: "vision", title: "My vision", description: profile.vision, category: "personal" });
  if (profile.careerDirection) items.push({ id: "career", title: "Career and life direction", description: profile.careerDirection, category: "career" });
  if (profile.impactAspirations) items.push({ id: "impact", title: "The impact I want to make", description: profile.impactAspirations, category: "impact" });
  for (const goal of records.goals.filter((entry) => entry.status === "active" && !goalIsDone(entry))) {
    items.push({ id: `goal-${goal.id}`, title: goal.title, description: goal.description ?? undefined, category: "personal", targetDate: goal.dueAt ?? undefined });
  }
  return items;
}

function GoalsSection({ records }: { records: LearnerRecords }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-2xl font-semibold text-navy">Personal Goals</h3>
        <Link href="/learn/goals" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy hover:text-gold-dark">
          <Target className="h-4 w-4" aria-hidden /> Manage goals
        </Link>
      </div>
      {records.goals.length ? (
        <ul className="space-y-4">
          {records.goals.map((goal) => {
            const done = goalIsDone(goal);
            return (
              <li key={goal.id} className="rounded-xl border border-stone-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{goal.title}</p>
                    {goal.description ? <p className="mt-1 text-sm text-stone-600">{goal.description}</p> : null}
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold capitalize text-stone-700">{done ? "achieved" : goal.status}</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100"
                    role="progressbar"
                    aria-label={`${goal.title} progress`}
                    aria-valuenow={goal.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className={`h-full rounded-full ${done ? "bg-green-500" : "bg-gold"}`} style={{ width: `${goal.progress}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold text-navy">{goal.progress}%</span>
                </div>
                {goal.dueAt ? <p className="mt-2 text-xs text-stone-500">Review by {formatDate(goal.dueAt)}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-stone-600">
          No goals yet. Set your first goal with your mentor on{" "}
          <Link href="/learn/goals" className="font-semibold text-navy underline decoration-gold decoration-2 underline-offset-2">
            the goals page
          </Link>
          .
        </p>
      )}
    </div>
  );
}
