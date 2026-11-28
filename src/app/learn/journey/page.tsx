import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Award, BookOpen, ClipboardCheck, PenLine, Target, TrendingUp } from "lucide-react";
import { JourneyTimeline } from "@/components/journey/journey-timeline";
import { MilestoneList, type Milestone } from "@/components/journey/milestone-card";
import { ReflectionTimeline } from "@/components/journey/reflection-timeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FeaturePending } from "@/components/ui/feature-pending";
import { getSessionUser } from "@/lib/auth";
import { getPurposeJourney, type PurposeJourney } from "@/db/purpose-journey";
import { getOwnLearnerRecords, type LearnerRecords } from "@/db/learner-records";
import { PRINCIPLE_INFO, goalIsDone } from "@/lib/purpose-journey";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Purpose Journey",
  description: "Track your personal development journey through the five principles of purpose.",
};

export default async function JourneyPage() {
  const user = await getSessionUser();
  if (!user) {
    notFound();
  }
  const [journey, records] = await Promise.all([getPurposeJourney(user.profileId, user), getOwnLearnerRecords(user)]);
  if (!journey || !records) return <FeaturePending feature="Your Purpose Journey" />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-ivory via-white to-warm-ivory pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-br from-navy via-navy/95 to-navy py-16">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="shell relative">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-2 text-sm font-semibold text-gold">
              <Target className="h-4 w-4" />
              <span>Personal Development Journey</span>
            </div>
            <h1 className="font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Your Purpose Journey
            </h1>
            <p className="mt-4 text-lg text-stone-300 sm:text-xl">
              Identity → Source → Purpose → Potential → Destiny
            </p>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="shell -mt-8 relative z-10">
        <StatsGrid journey={journey} records={records} />
      </section>

      {/* Main Content */}
      <section className="shell mt-12">
        <Tabs defaultValue="timeline" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h2 className="font-serif text-3xl font-semibold text-navy">
              Track Your Progress
            </h2>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="reflections">Reflections</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="timeline" className="mt-6">
            <JourneyTimelineView journey={journey} />
          </TabsContent>

          <TabsContent value="milestones" className="mt-6">
            <MilestonesView journey={journey} records={records} />
          </TabsContent>

          <TabsContent value="reflections" className="mt-6">
            <ReflectionsView records={records} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function StatsGrid({ journey, records }: { journey: PurposeJourney; records: LearnerRecords }) {
  const lessonsDone = journey.principles.reduce((sum, principle) => sum + principle.learning.done, 0);
  const lessonsTotal = journey.principles.reduce((sum, principle) => sum + principle.learning.total, 0);
  const instruments = journey.principles.flatMap((principle) => principle.assessments);
  const taken = instruments.filter((instrument) => instrument.result).length;

  const statCards = [
    {
      icon: TrendingUp,
      label: "Overall Progress",
      value: `${journey.overall}%`,
      subtext: lessonsTotal ? `${lessonsDone}/${lessonsTotal} lessons completed` : "Across the five principles",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: ClipboardCheck,
      label: "Assessments Taken",
      value: instruments.length ? `${taken}/${instruments.length}` : "0",
      subtext: "Purpose instruments",
      color: "from-amber-500 to-amber-600",
    },
    {
      icon: BookOpen,
      label: "Reflections",
      value: records.reflectionCount.toString(),
      subtext: "Personal insights",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Award,
      label: "Certificates",
      value: records.certificates.length.toString(),
      subtext: "Achievements earned",
      color: "from-green-500 to-green-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-lg transition-all hover:shadow-xl"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="absolute right-0 top-0 h-24 w-24 opacity-5">
              <div
                className={`h-full w-full rounded-full bg-gradient-to-br ${stat.color}`}
                style={{ transform: "translate(25%, -25%)" }}
              />
            </div>

            <div className="relative">
              <div className={`inline-flex rounded-xl bg-gradient-to-br ${stat.color} p-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <p className="mt-4 text-sm font-medium text-stone-500">{stat.label}</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-navy">{stat.value}</p>
              <p className="mt-1 text-xs text-stone-500">{stat.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JourneyTimelineView({ journey }: { journey: PurposeJourney }) {
  const stages = journey.principles.map((principle) => ({
    id: principle.key,
    name: principle.name,
    question: principle.question,
    color: principle.color,
    icon: null,
    progress: principle.score,
    // Every principle stays open in this programme; nothing is locked.
    status: principle.score >= 100 ? ("completed" as const) : ("current" as const),
    completedModules: principle.learning.modules.filter((module) => module.lessonCount > 0 && module.completedCount >= module.lessonCount).length,
    totalModules: principle.learning.modules.length,
    description: principle.focus,
  }));
  // Focus on the first principle, in journey order, that is not yet complete.
  const current = journey.principles.find((principle) => principle.score < 100) ?? journey.principles[journey.principles.length - 1];
  const next = journey.recommendations.find((item) => item.principle === current.key) ?? journey.recommendations[0];

  return (
    <div>
      <JourneyTimeline stages={stages} currentStageId={current.key} />

      <div className="mt-12 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-8">
        <h3 className="font-serif text-2xl font-semibold text-navy mb-4">
          Your Current Focus: {current.name}
        </h3>
        <p className="text-stone-600 leading-relaxed mb-2">
          {current.question} {current.focus}
        </p>
        <p className="text-stone-600 leading-relaxed mb-6">
          {current.score}% of the evidence for {current.name} is in place
          {current.learning.total ? ` · ${current.learning.done} of ${current.learning.total} lessons complete` : ""}.
        </p>
        <Link
          href={next?.href ?? "/learn/courses"}
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-semibold text-white transition-all hover:bg-navy/90 hover:shadow-lg"
        >
          <BookOpen className="h-5 w-5" />
          {next?.title ?? "Continue Learning"}
        </Link>
      </div>
    </div>
  );
}

function milestoneType(href: string): Milestone["type"] {
  if (href.startsWith("/learn/courses")) return "course";
  if (href.startsWith("/learn/instruments")) return "assessment";
  if (href.startsWith("/learn/goals")) return "goal";
  if (href.startsWith("/learn/profile")) return "profile";
  return "reflection";
}

function MilestonesView({ journey, records }: { journey: PurposeJourney; records: LearnerRecords }) {
  const upcoming: Milestone[] = [
    ...journey.recommendations.map((item, index) => ({
      id: `next-${index}`,
      title: item.title,
      description: item.detail,
      type: milestoneType(item.href),
      completedAt: null,
      href: item.href,
      relatedContent: item.principle ? PRINCIPLE_INFO[item.principle].name : undefined,
    })),
    ...records.goals
      .filter((goal) => goal.status === "active" && !goalIsDone(goal))
      .map((goal) => ({
        id: `goal-${goal.id}`,
        title: goal.title,
        description: goal.description ?? "An active goal you are working on with your mentor.",
        type: "goal" as const,
        completedAt: null,
        dueDate: goal.dueAt ?? undefined,
        progress: goal.progress,
        href: "/learn/goals",
      })),
  ];
  const completed: Milestone[] = [
    ...records.certificates.map((certificate) => ({
      id: `certificate-${certificate.id}`,
      title: certificate.title,
      description: certificate.kind === "level" ? "Level certificate issued." : "Course certificate issued.",
      type: "certificate" as const,
      completedAt: certificate.issuedAt,
    })),
    ...journey.principles.flatMap((principle) =>
      principle.assessments.flatMap((instrument) =>
        instrument.result
          ? [{
              id: `assessment-${instrument.slug}`,
              title: instrument.title,
              description: `Latest result: ${instrument.result.band} (score ${instrument.result.score}).`,
              type: "assessment" as const,
              completedAt: instrument.result.createdAt,
              relatedContent: principle.name,
            }]
          : [],
      ),
    ),
    ...records.goals.filter(goalIsDone).map((goal) => ({
      id: `goal-${goal.id}`,
      title: goal.title,
      description: goal.description ?? "Goal achieved.",
      type: "goal" as const,
      completedAt: goal.updatedAt,
    })),
  ].sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
  const milestones = [...upcoming, ...completed];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-stone-600">
          Your next steps, and the achievements already behind you.
        </p>
        <span className="text-sm text-stone-500">
          {completed.length} of {milestones.length} completed
        </span>
      </div>
      {milestones.length ? (
        <MilestoneList milestones={milestones} />
      ) : (
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
          No milestones yet. Start your first course or assessment and they will appear here.
        </p>
      )}
    </div>
  );
}

function ReflectionsView({ records }: { records: LearnerRecords }) {
  const reflections = records.reflections.map((reflection) => ({
    id: String(reflection.id),
    date: reflection.createdAt,
    principle: reflection.principle ?? undefined,
    title: reflection.prompt,
    content: reflection.body,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-stone-600">
          Your personal reflections and insights throughout your journey.
          {records.reflectionCount > reflections.length ? ` Showing your latest ${reflections.length} of ${records.reflectionCount}.` : ""}
        </p>
        <Link href="/learn/reflections" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-navy hover:text-gold-dark">
          <PenLine className="h-4 w-4" aria-hidden /> Write a reflection <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {reflections.length ? (
        <ReflectionTimeline reflections={reflections} />
      ) : (
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-stone-600">
          You have not written a reflection yet. Your reflections appear here as a timeline.
        </p>
      )}
    </div>
  );
}
