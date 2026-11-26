import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Calendar, Target, TrendingUp, Award, BookOpen } from "lucide-react";
import { JourneyTimeline } from "@/components/journey/journey-timeline";
import { MilestoneList } from "@/components/journey/milestone-card";
import { ReflectionTimeline } from "@/components/journey/reflection-timeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CircularProgress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "My Purpose Journey",
  description: "Track your personal development journey through the five principles of purpose.",
};

export default async function JourneyPage() {
  const user = await getSessionUser();
  if (!user) {
    notFound();
  }

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
        <Suspense fallback={<StatsGridSkeleton />}>
          <StatsGrid userId={user.id} />
        </Suspense>
      </section>

      {/* Main Content */}
      <section className="shell mt-12">
        <Tabs defaultValue="timeline" className="w-full">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h2 className="font-serif text-3xl font-semibold text-navy">
              Track Your Progress
            </h2>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="reflections">Reflections</TabsTrigger>
            </TabsList>
          </div>

          {/* Timeline View */}
          <TabsContent value="timeline" className="mt-6">
            <Suspense fallback={<TimelineSkeleton />}>
              <JourneyTimelineView userId={user.id} />
            </Suspense>
          </TabsContent>

          {/* Milestones View */}
          <TabsContent value="milestones" className="mt-6">
            <Suspense fallback={<MilestonesSkeleton />}>
              <MilestonesView userId={user.id} />
            </Suspense>
          </TabsContent>

          {/* Reflections View */}
          <TabsContent value="reflections" className="mt-6">
            <Suspense fallback={<ReflectionsSkeleton />}>
              <ReflectionsView userId={user.id} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

async function StatsGrid({ userId }: { userId: string }) {
  // Fetch user progress data
  const stats = {
    overallProgress: 68,
    completedModules: 12,
    totalModules: 51,
    currentStreak: 7,
    reflectionsCount: 23,
    certificatesEarned: 2,
  };

  const statCards = [
    {
      icon: TrendingUp,
      label: "Overall Progress",
      value: `${stats.overallProgress}%`,
      subtext: `${stats.completedModules}/${stats.totalModules} modules`,
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Calendar,
      label: "Learning Streak",
      value: `${stats.currentStreak} days`,
      subtext: "Keep it going!",
      color: "from-amber-500 to-amber-600",
    },
    {
      icon: BookOpen,
      label: "Reflections",
      value: stats.reflectionsCount.toString(),
      subtext: "Personal insights",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Award,
      label: "Certificates",
      value: stats.certificatesEarned.toString(),
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

async function JourneyTimelineView({ userId }: { userId: string }) {
  // Mock data - replace with actual database queries
  const stages = [
    {
      id: "identity",
      name: "Identity",
      question: "Who Am I?",
      color: "#071F46",
      icon: null,
      progress: 100,
      status: "completed" as const,
      completedModules: 10,
      totalModules: 10,
      description: "Understanding your unique identity, values, and core strengths.",
    },
    {
      id: "source",
      name: "Source",
      question: "Where Am I From?",
      color: "#2f6b40",
      icon: null,
      progress: 80,
      status: "current" as const,
      completedModules: 8,
      totalModules: 10,
      description: "Exploring your foundations, experiences, and influences.",
    },
    {
      id: "purpose",
      name: "Purpose",
      question: "Why Am I Here?",
      color: "#b98a1f",
      icon: null,
      progress: 45,
      status: "current" as const,
      completedModules: 5,
      totalModules: 11,
      description: "Discovering your unique purpose and contribution to the world.",
    },
    {
      id: "potential",
      name: "Potential",
      question: "What Can I Do?",
      color: "#5a3a8a",
      icon: null,
      progress: 20,
      status: "current" as const,
      completedModules: 2,
      totalModules: 10,
      description: "Developing your skills, capabilities, and talents.",
    },
    {
      id: "destiny",
      name: "Destiny",
      question: "Where Am I Going?",
      color: "#155e63",
      icon: null,
      progress: 0,
      status: "locked" as const,
      completedModules: 0,
      totalModules: 10,
      description: "Creating your vision, direction, and meaningful impact.",
    },
  ];

  return (
    <div>
      <JourneyTimeline stages={stages} currentStageId="purpose" />
      
      <div className="mt-12 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-8">
        <h3 className="font-serif text-2xl font-semibold text-navy mb-4">
          Your Current Focus: Purpose
        </h3>
        <p className="text-stone-600 leading-relaxed mb-6">
          You're currently exploring the Purpose principle, discovering why you're here and what unique contribution you can make to the world. Continue with the next module to deepen your understanding.
        </p>
        <button className="inline-flex items-center gap-2 rounded-xl bg-navy px-6 py-3 font-semibold text-white transition-all hover:bg-navy/90 hover:shadow-lg">
          <BookOpen className="h-5 w-5" />
          Continue Learning
        </button>
      </div>
    </div>
  );
}

async function MilestonesView({ userId }: { userId: string }) {
  // Mock data - replace with actual database queries
  const milestones = [
    {
      id: "1",
      title: "Complete Identity Assessment",
      description: "Discover your core values, strengths, and unique identity markers.",
      type: "assessment" as const,
      completedAt: new Date("2026-11-15"),
      relatedContent: "Identity",
    },
    {
      id: "2",
      title: "Foundations of Purpose Course",
      description: "Understanding the fundamental principles of living with purpose.",
      type: "course" as const,
      completedAt: new Date("2026-11-20"),
      relatedContent: "Purpose",
    },
    {
      id: "3",
      title: "Weekly Reflection: Identity",
      description: "Reflect on your identity journey and key learnings this week.",
      type: "reflection" as const,
      completedAt: null,
      dueDate: new Date("2026-11-30"),
      progress: 60,
      relatedContent: "Identity",
    },
    {
      id: "4",
      title: "Purpose Discovery Module",
      description: "Deep dive into discovering your unique purpose and calling.",
      type: "course" as const,
      completedAt: null,
      progress: 45,
      relatedContent: "Purpose",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-stone-600">
          Track your key achievements and upcoming milestones in your journey.
        </p>
        <span className="text-sm text-stone-500">
          {milestones.filter(m => m.completedAt).length} of {milestones.length} completed
        </span>
      </div>
      <MilestoneList milestones={milestones} />
    </div>
  );
}

async function ReflectionsView({ userId }: { userId: string }) {
  // Mock data - replace with actual database queries
  const reflections = [
    {
      id: "1",
      date: new Date("2026-11-25"),
      principle: "purpose" as const,
      title: "Understanding My Why",
      content: "Today I realized that my purpose is deeply connected to helping others discover their own potential. The assessment helped me see patterns in my life that I hadn't noticed before. I'm excited to explore this further.",
      mood: "inspired" as const,
      tags: ["breakthrough", "clarity", "vision"],
    },
    {
      id: "2",
      date: new Date("2026-11-20"),
      principle: "identity" as const,
      title: "Core Values Reflection",
      content: "Identifying my core values was eye-opening. Integrity, growth, and compassion keep showing up in my decisions. This explains so many of my life choices.",
      mood: "grateful" as const,
      tags: ["values", "self-awareness"],
    },
    {
      id: "3",
      date: new Date("2026-11-15"),
      principle: "source" as const,
      title: "Looking Back to Move Forward",
      content: "Reflecting on my background and experiences has given me perspective on how I've arrived at this point. The challenges I've faced have shaped me in ways I'm only now beginning to understand.",
      mood: "hopeful" as const,
      tags: ["growth", "perspective"],
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-stone-600">
          Your personal reflections and insights throughout your journey.
        </p>
      </div>
      <ReflectionTimeline reflections={reflections} />
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-stone-200 bg-white p-6">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="mt-4 h-4 w-24" />
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function MilestonesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

function ReflectionsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}
