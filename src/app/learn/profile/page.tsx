import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Award, Briefcase, Heart, Target, TrendingUp, User } from "lucide-react";
import { VisionBoard } from "@/components/profile/vision-board";
import { ValuesChart } from "@/components/profile/values-chart";
import { PurposeStatement } from "@/components/profile/purpose-statement";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth";

export const metadata = {
  title: "My Purpose Profile",
  description: "Your comprehensive profile including values, strengths, vision, and purpose statement.",
};

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-ivory via-white to-warm-ivory pb-20">
      {/* Profile Header */}
      <section className="border-b border-stone-200 bg-white">
        <div className="shell py-12">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar
              src={user.profileImageUrl}
              fallback={user.fullName || user.email}
              size="xl"
              className="ring-4 ring-gold/20"
            />
            
            <div className="flex-1">
              <h1 className="font-serif text-3xl font-semibold text-navy sm:text-4xl">
                {user.fullName || "Your Profile"}
              </h1>
              <p className="mt-2 text-stone-600">{user.email}</p>
              
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  <User className="h-4 w-4" />
                  <span>{user.role || "Learner"}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                  <Award className="h-4 w-4" />
                  <span>2 Certificates</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                  <TrendingUp className="h-4 w-4" />
                  <span>68% Complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Content */}
      <section className="shell mt-12">
        <Tabs defaultValue="overview" className="w-full">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h2 className="font-serif text-3xl font-semibold text-navy">
              Your Purpose Profile
            </h2>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="values">Values</TabsTrigger>
              <TabsTrigger value="vision">Vision</TabsTrigger>
              <TabsTrigger value="goals">Goals</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Purpose Statement */}
            <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
              <PurposeStatementSection userId={user.id} />
            </Suspense>

            {/* Values Overview */}
            <div className="grid gap-8 lg:grid-cols-2">
              <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
                <ValuesOverview userId={user.id} />
              </Suspense>

              <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
                <StrengthsOverview userId={user.id} />
              </Suspense>
            </div>

            {/* Quick Stats */}
            <Suspense fallback={<StatsGridSkeleton />}>
              <ProfileStats userId={user.id} />
            </Suspense>
          </TabsContent>

          {/* Values Tab */}
          <TabsContent value="values" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-[600px] rounded-2xl" />}>
              <ValuesDetailSection userId={user.id} />
            </Suspense>
          </TabsContent>

          {/* Vision Tab */}
          <TabsContent value="vision" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-[600px] rounded-2xl" />}>
              <VisionBoardSection userId={user.id} />
            </Suspense>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Suspense fallback={<Skeleton className="h-[600px] rounded-2xl" />}>
              <GoalsSection userId={user.id} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

async function PurposeStatementSection({ userId }: { userId: string }) {
  // Mock data - replace with actual database query
  const statement = "I exist to empower individuals to discover their unique purpose and develop the skills necessary to create meaningful impact in their communities and the world.";

  return (
    <PurposeStatement
      initialStatement={statement}
      onSave={async (newStatement) => {
        "use server";
        // Save to database
        console.log("Saving purpose statement:", newStatement);
      }}
    />
  );
}

async function ValuesOverview({ userId }: { userId: string }) {
  // Mock data - replace with actual database query
  const values = [
    { id: "1", name: "Integrity", score: 9, description: "Honesty and strong moral principles", color: "#071F46" },
    { id: "2", name: "Growth", score: 8, description: "Continuous learning and development", color: "#2f6b40" },
    { id: "3", name: "Compassion", score: 9, description: "Empathy and care for others", color: "#b98a1f" },
    { id: "4", name: "Excellence", score: 7, description: "Striving for the highest quality", color: "#5a3a8a" },
    { id: "5", name: "Innovation", score: 8, description: "Creative problem-solving", color: "#155e63" },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <h3 className="mb-6 font-serif text-2xl font-semibold text-navy">
        Core Values
      </h3>
      <ValuesChart values={values} variant="pie" />
    </div>
  );
}

async function StrengthsOverview({ userId }: { userId: string }) {
  const strengths = [
    { name: "Strategic Thinking", score: 85, color: "#071F46" },
    { name: "Communication", score: 90, color: "#2f6b40" },
    { name: "Leadership", score: 75, color: "#b98a1f" },
    { name: "Creativity", score: 80, color: "#5a3a8a" },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6">
      <h3 className="mb-6 font-serif text-2xl font-semibold text-navy">
        Key Strengths
      </h3>
      <div className="space-y-4">
        {strengths.map((strength, index) => (
          <div key={strength.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-navy">{strength.name}</span>
              <span className="text-sm text-stone-500">{strength.score}%</span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${strength.score}%`,
                  backgroundColor: strength.color,
                  transitionDelay: `${index * 100}ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function ProfileStats({ userId }: { userId: string }) {
  const stats = [
    { icon: Target, label: "Active Goals", value: "5", color: "from-blue-500 to-blue-600" },
    { icon: Heart, label: "Reflections", value: "23", color: "from-pink-500 to-pink-600" },
    { icon: Briefcase, label: "Skills Developed", value: "12", color: "from-purple-500 to-purple-600" },
    { icon: Award, label: "Achievements", value: "8", color: "from-green-500 to-green-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-xl border border-stone-200 bg-white p-6"
          >
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

async function ValuesDetailSection({ userId }: { userId: string }) {
  const values = [
    { id: "1", name: "Integrity", score: 9, description: "Honesty and strong moral principles", color: "#071F46" },
    { id: "2", name: "Growth", score: 8, description: "Continuous learning and development", color: "#2f6b40" },
    { id: "3", name: "Compassion", score: 9, description: "Empathy and care for others", color: "#b98a1f" },
    { id: "4", name: "Excellence", score: 7, description: "Striving for the highest quality", color: "#5a3a8a" },
    { id: "5", name: "Innovation", score: 8, description: "Creative problem-solving", color: "#155e63" },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8">
      <div className="mb-8">
        <h3 className="font-serif text-2xl font-semibold text-navy">
          Values in Detail
        </h3>
        <p className="mt-2 text-stone-600">
          Explore your core values in different visualizations
        </p>
      </div>

      <Tabs defaultValue="bar" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          <TabsTrigger value="pie">Pie Chart</TabsTrigger>
          <TabsTrigger value="radar">Radar Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="bar">
          <ValuesChart values={values} variant="bar" />
        </TabsContent>

        <TabsContent value="pie">
          <ValuesChart values={values} variant="pie" />
        </TabsContent>

        <TabsContent value="radar">
          <ValuesChart values={values} variant="radar" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function VisionBoardSection({ userId }: { userId: string }) {
  const visionItems = [
    {
      id: "1",
      title: "Launch My Purpose-Driven Business",
      description: "Create a social enterprise that empowers youth",
      category: "career" as const,
      priority: "high" as const,
      targetDate: new Date(2027, 6, 1),
    },
    {
      id: "2",
      title: "Complete Advanced Leadership Program",
      description: "Enhance my leadership and management skills",
      category: "personal" as const,
      priority: "high" as const,
      targetDate: new Date(2027, 0, 1),
    },
    {
      id: "3",
      title: "Impact 1000 Lives",
      description: "Through mentorship and community programs",
      category: "impact" as const,
      priority: "medium" as const,
      targetDate: new Date(2028, 11, 31),
    },
  ];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8">
      <VisionBoard
        items={visionItems}
        onAdd={async (item) => {
          "use server";
          console.log("Adding vision item:", item);
        }}
        onUpdate={async (id, updates) => {
          "use server";
          console.log("Updating vision item:", id, updates);
        }}
        onDelete={async (id) => {
          "use server";
          console.log("Deleting vision item:", id);
        }}
      />
    </div>
  );
}

async function GoalsSection({ userId }: { userId: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8">
      <h3 className="font-serif text-2xl font-semibold text-navy mb-6">
        Personal Goals
      </h3>
      <p className="text-stone-600">
        Goal tracking coming soon. This section will display your active goals, progress, and achievements.
      </p>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-stone-200 bg-white p-6">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <Skeleton className="mt-4 h-4 w-24" />
          <Skeleton className="mt-2 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
