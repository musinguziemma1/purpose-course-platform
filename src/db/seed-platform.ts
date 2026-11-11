import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  cohortMembers,
  cohortWeeks,
  cohorts,
  communities,
  communityMembers,
  courseLevels,
  courses,
  discussionThreads,
  instrumentResults,
  instruments,
  learnerFlags,
  learnerGoals,
  liveSessions,
  mentorAssignments,
  mentoringNotes,
  notificationPreferences,
  orgMemberships,
  organizations,
  profiles,
  roles,
  sessionAttendance,
} from "./schema";
import { seedInstruments, submitInstrument } from "./engine";

const daysAgo = (days: number, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const daysAhead = (days: number, hour = 9) => daysAgo(-days, hour);

export async function seedPlatform() {
  const profileRows = await db
    .select({ id: profiles.id, slug: profiles.slug, roleSlug: roles.slug, fullName: profiles.fullName })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id));
  const student = profileRows.find((row) => row.roleSlug === "student");
  const mentor = profileRows.find((row) => row.roleSlug === "mentor");
  const editor = profileRows.find((row) => row.roleSlug === "editor");
  const admin = profileRows.find((row) => row.roleSlug === "super_admin");
  if (!student || !mentor) return { instruments: 0 };

  /* ---------------- Organisations & memberships ---------------- */
  const [org] = await db
    .insert(organizations)
    .values({
      slug: "school-of-purpose-and-leadership",
      name: "The School of Purpose and Leadership",
      plan: "platform",
      country: "Uganda",
    })
    .returning({ id: organizations.id });
  await db
    .insert(orgMemberships)
    .values(
      profileRows.map((row) => ({ organizationId: org.id, profileId: row.id, roleSlug: row.roleSlug })),
    )
    .onConflictDoNothing();
  await db.update(profiles).set({ organizationId: org.id });

  /* ---------------- Instrument engine ---------------- */
  const instrumentCount = await seedInstruments();
  const identityInstrument = (await db.select().from(instruments).where(eq(instruments.slug, "identity-anchoring")).limit(1))[0];
  const purposeInstrument = (await db.select().from(instruments).where(eq(instruments.slug, "purpose-clarity")).limit(1))[0];

  if (identityInstrument && purposeInstrument) {
    const { instrumentItems } = await import("./schema");
    for (const [instrument, values] of [
      [identityInstrument, [4, 3, 4, 2, 3, 2, 4, 2, 4]],
      [purposeInstrument, [4, 4, 3, 4, 3, 3, 3, 4, 2]],
    ] as const) {
      const items = await db.select().from(instrumentItems).where(eq(instrumentItems.instrumentId, instrument.id));
      if (items.length === 0) continue;
      await submitInstrument({
        instrumentId: instrument.id,
        profileId: student.id,
        consentGiven: true,
        sharedWithMentor: true,
        responses: items.map((item, index) => ({ itemId: item.id, rawValue: values[index % values.length] })),
      });
    }
  }

  /* ---------------- Purpose communities ---------------- */
  const communitySeeds = [
    ["general-purpose-discovery", "General Purpose Discovery", "Purpose Discovery", "Open conversation on calling, identity and the first questions of the programme.", "gold"],
    ["career-and-calling", "Career & Calling", "Purpose", "How assignment and work meet — decisions, transitions and Monday mornings.", "navy"],
    ["leadership", "Leadership", "Leadership", "Character, influence and the cost of leading well in public.", "purple"],
    ["young-adults", "Young Adults", "Personal Development", "For learners under 30 building a foundation before building a platform.", "teal"],
    ["entrepreneurship", "Entrepreneurship", "Purpose", "Building ventures that serve a burden rather than an ego.", "green"],
    ["personal-development", "Personal Development", "Personal Development", "Habits, reflection and the slow work of formation.", "navy"],
    ["vision-and-goals", "Vision & Goals", "Vision", "Pictures, pathways, costs and the discipline of review.", "gold"],
  ] as const;

  const communityRows = await db
    .insert(communities)
    .values(
      communitySeeds.map(([slug, name, category, description, accent], index) => ({
        slug,
        name,
        category,
        description,
        accent,
        visibility: index === 0 ? "public" : "members",
        guidelines:
          "Speak from your own experience, ask before advising, protect confidentiality, and report anything that harms the room.",
        sortOrder: index + 1,
        coverImageUrl: "/images/community.jpg",
      })),
    )
    .returning({ id: communities.id, slug: communities.slug });

  const general = communityRows[0];
  const career = communityRows[1];
  const visionCommunity = communityRows[6];

  await db
    .insert(communityMembers)
    .values(
      communityRows.flatMap((community) =>
        profileRows
          .filter((row) => ["student", "mentor", "editor", "super_admin"].includes(row.roleSlug))
          .map((row) => ({ communityId: community.id, profileId: row.id, role: row.roleSlug === "mentor" ? "facilitator" : "member" })),
      ),
    )
    .onConflictDoNothing();

  await db.insert(discussionThreads).values([
    {
      communityId: general.id,
      title: "What did PURP 102 change about how you see your work?",
      prompt: "Share one practice you are actually keeping this week — no theory, just the practice.",
      threadType: "discussion",
      authorName: mentor.fullName,
      authorId: mentor.id,
      isPinned: true,
      replyCount: 2,
      lastActivityAt: daysAgo(0, 8),
    },
    {
      communityId: career.id,
      title: "Question: how do I test a burden before I build anything?",
      prompt: "I have a burden for vocational training among school leavers but I do not want to launch something sentimental. What is a faithful 90-day experiment?",
      threadType: "question",
      authorName: "Sarah Nabwire",
      authorId: student.id,
      replyCount: 1,
      lastActivityAt: daysAgo(1, 15),
    },
    {
      communityId: visionCommunity.id,
      title: "Post your Tuesday: five years from now",
      prompt: "Write a normal Tuesday in the life you are building. Keep it concrete enough that someone could picture the room you are in.",
      threadType: "discussion",
      authorName: student.fullName,
      authorId: student.id,
      replyCount: 0,
      lastActivityAt: daysAgo(2, 11),
    },
  ]);

  /* ---------------- Cohort ---------------- */
  const levelRows = await db.select().from(courseLevels).orderBy(courseLevels.sortOrder);
  const courseRows = await db.select().from(courses);
  const intermediate = courseRows.find((row) => row.slug === "purpose-discovery-clarity") ?? courseRows[0];
  const cohortWeeksSeed = [
    ["Identity", "Identity", "Who am I before what I do?"],
    ["Source", "Source", "Naming inheritance and grief"],
    ["Purpose", "Purpose", "From sense to statement"],
    ["Potential", "Potential", "Gifting evidence and ceilings"],
    ["Vision", "Destiny", "Picture, pathway and cost"],
    ["Relationships", "Potential", "Tables, mentors and truth-tellers"],
    ["Action", "Purpose", "The ninety-day deployment"],
    ["Transformation", "Identity", "Story, panel and commissioning"],
  ] as const;

  const [cohort] = await db
    .insert(cohorts)
    .values({
      slug: "cohort-04-2026",
      name: "Purpose Course — Cohort 04 · 2026",
      levelId: levelRows[1]?.id ?? levelRows[0]?.id ?? null,
      courseId: intermediate?.id ?? null,
      description:
        "An eight-week purpose discovery cohort. Fifty learners, five mentors, ten discussion groups, one live class and one group-work studio each week.",
      status: "active",
      capacity: 50,
      startsAt: daysAgo(21),
      endsAt: daysAhead(35),
      cadence: "Tuesday live class · Thursday group work · weekly reflection",
      coverImageUrl: "/images/community.jpg",
    })
    .returning({ id: cohorts.id });

  await db.insert(cohortWeeks).values(
    cohortWeeksSeed.map(([title, theme, focus], index) => ({
      cohortId: cohort.id,
      weekNumber: index + 1,
      title: `Week ${index + 1} — ${title}`,
      theme,
      focus,
      assignmentBrief:
        index === 2
          ? "Submit two drafts of your purpose statement with the evidence behind each part."
          : index === 3
            ? "Gifting audit with peer evidence from three people who have worked with you."
            : index === 7
              ? "Present your transformation story and ninety-day deployment plan to the panel."
              : "Complete the weekly reflection and bring one honest question to the live class.",
      startsAt: daysAgo(21 - index * 7),
      endsAt: daysAgo(14 - index * 7),
    })),
  );

  await db
    .insert(cohortMembers)
    .values([
      { cohortId: cohort.id, profileId: student.id, role: "learner", status: "active" },
      { cohortId: cohort.id, profileId: mentor.id, role: "mentor", status: "active" },
      ...(editor ? [{ cohortId: cohort.id, profileId: editor.id, role: "learner" as const, status: "active" as const }] : []),
      ...(admin ? [{ cohortId: cohort.id, profileId: admin.id, role: "facilitator" as const, status: "active" as const }] : []),
    ])
    .onConflictDoNothing();

  const existingSessions = await db.select().from(liveSessions).limit(4);
  for (const [index, session] of existingSessions.entries()) {
    await db.update(liveSessions).set({ cohortId: cohort.id }).where(eq(liveSessions.id, session.id));
    await db
      .insert(sessionAttendance)
      .values([
        {
          liveSessionId: session.id,
          profileId: student.id,
          status: index === 0 ? "present" : index === 1 ? "late" : "excused",
          minutesAttended: index === 0 ? session.durationMinutes : index === 1 ? 55 : 0,
          markedById: mentor.id,
          markedAt: daysAgo(7 - index),
        },
        ...(editor
          ? [{ liveSessionId: session.id, profileId: editor.id, status: "absent", minutesAttended: 0, markedById: mentor.id }]
          : []),
      ])
      .onConflictDoNothing();
  }

  /* ---------------- Mentorship ---------------- */
  await db
    .insert(mentorAssignments)
    .values([
      { mentorId: mentor.id, studentId: student.id, assignedById: admin?.id ?? null, focus: "Purpose statement & gifting evidence", status: "active" },
      ...(editor ? [{ mentorId: mentor.id, studentId: editor.id, assignedById: admin?.id ?? null, focus: "Editorial calling and leadership", status: "active" }] : []),
    ])
    .onConflictDoNothing();

  await db.insert(learnerGoals).values([
    {
      studentId: student.id,
      mentorId: mentor.id,
      title: "Write and test a purpose statement",
      description: "Draft two versions, run the four-part test with a peer and a mentor, and submit the final statement.",
      status: "active",
      progress: 60,
      dueAt: daysAhead(5),
    },
    {
      studentId: student.id,
      mentorId: mentor.id,
      title: "Gather gifting evidence from three people",
      description: "Ask for one specific example per claimed strength; move anything unevidenced into the unknown column.",
      status: "achieved",
      progress: 100,
      dueAt: daysAgo(4),
      reviewNotes: "Completed with strong evidence. Next: name the limit each gift implies.",
    },
    {
      studentId: student.id,
      mentorId: mentor.id,
      title: "Lead one group-work studio",
      description: "Facilitate the gifting-evidence panel for your group and submit the shared summary.",
      status: "active",
      progress: 20,
      dueAt: daysAhead(12),
    },
  ]);

  await db.insert(mentoringNotes).values([
    {
      studentId: student.id,
      mentorId: mentor.id,
      body: "Session 3: Joan named the burden for vocational training clearly and without performance. Evidence is strong in teaching and administration; the gap is willingness to be seen making a decision. Homework: write the 300-word story and remove every flattering adjective.",
      visibility: "shared",
      createdAt: daysAgo(12, 14),
    },
    {
      studentId: student.id,
      mentorId: mentor.id,
      body: "Follow-up: the statement is now specific enough to test. We agreed she will run the two-person test this week and bring the verbatim feedback. Watch the tendency to over-explain when challenged.",
      visibility: "shared",
      createdAt: daysAgo(4, 16),
    },
  ]);

  await db.insert(learnerFlags).values([
    {
      studentId: student.id,
      mentorId: mentor.id,
      reason: "Assessment average slipped below the pass mark after the second session quiz; offer a coaching conversation before the next attempt.",
      severity: "attention",
      status: "open",
      createdAt: daysAgo(1, 18),
    },
  ]);

  /* ---------------- Notification preferences ---------------- */
  await db
    .insert(notificationPreferences)
    .values(
      ["mentorship", "learning", "community", "assessments", "sessions", "account"].map((category) => ({
        profileId: student.id,
        category,
        inApp: true,
        email: category !== "community",
        push: category === "sessions",
      })),
    )
    .onConflictDoNothing();

  const resultCount = await db.select({ id: instrumentResults.id }).from(instrumentResults).where(eq(instrumentResults.profileId, student.id));

  return {
    instruments: instrumentCount,
    communities: communityRows.length,
    cohortWeeks: cohortWeeksSeed.length,
    instrumentResults: resultCount.length,
  };
}
