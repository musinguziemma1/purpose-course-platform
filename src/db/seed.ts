import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { ROLE_CATALOG } from "../lib/roles";
import { seedAcademyContent } from "./seed-academy";
import { seedAssessments } from "./seed-assessments";
import { seedPlatform } from "./seed-platform";
import { seedEnterprise } from "./seed-enterprise";
import {
  achievements,
  activityLogs,
  analyticsReports,
  articleRevisions,
  dataChanges,
  emailEvents,
  engagementSnapshots,
  learnerAchievements,
  learningActivities,
  learningEvents,
  messages,
  permissions,
  platformEvents,
  rolePermissions,
  scoringRules,
  securityEvents,
  cohortMembers,
  cohortWeeks,
  cohorts,
  communities,
  communityMembers,
  contentReports,
  instrumentBands,
  instrumentDimensions,
  instrumentItems,
  instrumentResponses,
  instrumentResults,
  instrumentSessions,
  instruments,
  learnerFlags,
  learnerGoals,
  mentorAssignments,
  mentoringNotes,
  notificationOutbox,
  notificationPreferences,
  orgMemberships,
  organizations,
  reactions,
  sessionAttendance,
  assessmentAnswers,
  assessmentAttempts,
  assessmentQuestions,
  assessments,
  certificates,
  courseGroups,
  groupMembers,
  groupSubmissions,
  courseModules,
  courses,
  lessonProgress,
  lessons,
  liveMessages,
  liveRsvps,
  liveSessions,
  articleReviews,
  articleTags,
  articles,
  assignmentSubmissions,
  assignments,
  authSessions,
  categories,
  coachingSessions,
  courseLevels,
  courseSessions,
  discussionGroups,
  discussionPosts,
  discussionThreads,
  enrollments,
  learningProgress,
  mediaAssets,
  navigation,
  notifications,
  pages,
  profiles,
  reflections,
  resourceDownloads,
  resources,
  roles,
  siteSettings,
  subscribers,
  tags,
  testimonials,
  users,
} from "./schema";

function hash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const daysAgo = (days: number, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const daysAhead = (days: number, hour = 8) => daysAgo(-days, hour);

const IMG = {
  workshop: "/images/hero-workshop.jpg",
  roundTable: "/images/community.jpg",
  mentorship: "/images/mentorship.jpg",
  conversation: "/images/mentorship.jpg",
  study: "/images/student-study.jpg",
  journal: "/images/journal-purpose.jpg",
  summit: "/images/level-advanced.jpg",
  summitSunrise: "/images/level-advanced.jpg",
  garden: "/images/level-foundation.jpg",
  listening: "/images/community.jpg",
  identity: "/images/journal-identity.jpg",
};

async function main() {
  console.log("Resetting Purpose Course data…");
  await db.execute(sql`
    truncate table
      ${activityLogs}, ${notifications}, ${discussionPosts}, ${discussionThreads},
      ${learnerAchievements}, ${achievements}, ${learningActivities}, ${scoringRules},
      ${rolePermissions}, ${permissions}, ${messages}, ${emailEvents},
      ${platformEvents}, ${learningEvents}, ${engagementSnapshots}, ${analyticsReports},
      ${securityEvents}, ${dataChanges},
      ${notificationPreferences}, ${notificationOutbox}, ${sessionAttendance}, ${cohortWeeks},
      ${cohortMembers}, ${cohorts}, ${reactions}, ${contentReports}, ${communityMembers}, ${communities},
      ${learnerFlags}, ${mentoringNotes}, ${learnerGoals}, ${mentorAssignments},
      ${instrumentResults}, ${instrumentResponses}, ${instrumentSessions}, ${instrumentBands},
      ${instrumentItems}, ${instrumentDimensions}, ${instruments},
      ${orgMemberships}, ${organizations},
      ${discussionGroups}, ${assessmentAnswers}, ${assessmentAttempts}, ${assessmentQuestions}, ${assessments},
      ${groupSubmissions}, ${groupMembers}, ${courseGroups}, ${certificates},
      ${liveMessages}, ${liveRsvps}, ${liveSessions},
      ${lessonProgress}, ${lessons}, ${courseModules}, ${courses},
      ${assignmentSubmissions}, ${assignments}, ${coachingSessions},
      ${learningProgress}, ${enrollments}, ${resourceDownloads},
      ${resources}, ${testimonials}, ${courseSessions}, ${courseLevels},
      ${articleTags}, ${articleReviews}, ${articleRevisions}, ${articles}, ${tags},
      ${categories}, ${subscribers}, ${navigation}, ${siteSettings}, ${pages},
      ${mediaAssets}, ${profiles}, ${authSessions}, ${users}, ${roles}
    restart identity cascade
  `);

  /* ---------------------------------------------------------------- Roles */
  const roleRows = await db
    .insert(roles)
    .values(
      ROLE_CATALOG.map((role) => ({
        slug: role.slug,
        name: role.name,
        level: role.level,
        description: role.blurb,
        permissions: [...role.permissions],
      })),
    )
    .returning();

  const roleBySlug = Object.fromEntries(roleRows.map((role) => [role.slug, role]));
  const password = hash("Purpose2026!");

  const userRows = await db
    .insert(users)
    .values([
      { email: "admin@purposecourse.org", passwordHash: password },
      { email: "editor@purposecourse.org", passwordHash: password },
      { email: "author@purposecourse.org", passwordHash: password },
      { email: "writer@purposecourse.org", passwordHash: password },
      { email: "mentor@purposecourse.org", passwordHash: password },
      { email: "student@purposecourse.org", passwordHash: password },
    ])
    .returning();

  const profileRows = await db
    .insert(profiles)
    .values([
      {
        userId: userRows[0].id,
        roleId: roleBySlug.super_admin.id,
        fullName: "Alex Ssenyondo",
        slug: "alex-ssenyondo",
        title: "Founder & Lead Facilitator",
        bio: "Alex founded the School of Purpose and Leadership and facilitates the Foundation level. He has walked with more than 600 participants through the five purpose principles.",
      },
      {
        userId: userRows[1].id,
        roleId: roleBySlug.editor.id,
        fullName: "Grace Namusoke",
        slug: "grace-namusoke",
        title: "Managing Editor",
        bio: "Grace leads the editorial desk, shaping the Purpose Journal and coaching new writers through their first submissions.",
      },
      {
        userId: userRows[2].id,
        roleId: roleBySlug.author.id,
        fullName: "Daniel Okello",
        slug: "daniel-okello",
        title: "Writer & Community Host",
        bio: "Daniel writes on identity, work and calling, and hosts the weekly Purpose Lounge conversation.",
      },
      {
        userId: userRows[3].id,
        roleId: roleBySlug.author.id,
        fullName: "Ruth Achieng",
        slug: "ruth-achieng",
        title: "Editorial Fellow",
        bio: "Ruth is an editorial fellow documenting stories of purpose from the Intermediate cohort.",
      },
      {
        userId: userRows[4].id,
        roleId: roleBySlug.mentor.id,
        fullName: "Miriam Kaggwa",
        slug: "miriam-kaggwa",
        title: "Clarity Coach & Mentor",
        bio: "Miriam walks Intermediate participants through the clarity sessions — gifting, story and the purpose statement — and reviews their assignments with direct, kind feedback.",
      },
      {
        userId: userRows[5].id,
        roleId: roleBySlug.student.id,
        fullName: "Joan Kirabo",
        slug: "joan-kirabo",
        title: "Intermediate participant · Cohort 04",
        bio: "Financial analyst working through Purpose Discovery and Clarity with Coach Miriam.",
      },
    ])
    .returning();

  const admin = profileRows[0];
  const editor = profileRows[1];
  const author = profileRows[2];
  const fellow = profileRows[3];
  const mentor = profileRows[4];
  const student = profileRows[5];

  /* ----------------------------------------------------------- Categories */
  const categoryRows = await db
    .insert(categories)
    .values([
      {
        slug: "identity",
        name: "Identity",
        principleQuestion: "Who Am I?",
        accent: "navy",
        sortOrder: 1,
        description:
          "Discover the person God made you to be — your gifts, story and design — before the roles you perform.",
      },
      {
        slug: "source",
        name: "Source",
        principleQuestion: "Where Am I From?",
        accent: "green",
        sortOrder: 2,
        description:
          "Trace your origin, heritage and gifting back to their source, so purpose is rooted instead of borrowed.",
      },
      {
        slug: "purpose",
        name: "Purpose",
        principleQuestion: "Why Am I Here?",
        accent: "gold",
        sortOrder: 3,
        description:
          "Move from a vague sense of calling to a clear purpose statement you can live, work and lead from.",
      },
      {
        slug: "potential",
        name: "Potential",
        principleQuestion: "What Can I Do?",
        accent: "purple",
        sortOrder: 4,
        description:
          "Name the capacity God placed inside you and convert it into competence, contribution and craft.",
      },
      {
        slug: "destiny",
        name: "Destiny",
        principleQuestion: "Where Am I Going?",
        accent: "teal",
        sortOrder: 5,
        description:
          "Build a vision for the road ahead — positioning, timing and influence aligned with your assignment.",
      },
    ])
    .returning();

  const cat = Object.fromEntries(categoryRows.map((row) => [row.slug, row.id]));

  /* ----------------------------------------------------------------- Tags */
  const tagNames = [
    ["purpose-discovery", "Purpose discovery"],
    ["calling", "Calling"],
    ["identity", "Identity"],
    ["work", "Work & career"],
    ["leadership", "Leadership"],
    ["vision", "Vision"],
    ["mentorship", "Mentorship"],
    ["prayer", "Prayer & practice"],
    ["community", "Community"],
    ["relationships", "Relationships"],
    ["legacy", "Legacy"],
    ["clarity", "Clarity"],
    ["gifts", "Gifts & talent"],
    ["rest", "Rest & rhythm"],
  ] as const;

  const tagRows = await db
    .insert(tags)
    .values(tagNames.map(([slug, name]) => ({ slug, name })))
    .returning();
  const tagId = Object.fromEntries(tagRows.map((row) => [row.slug, row.id]));

  /* --------------------------------------------------------- Course levels */
  const levelRows = await db
    .insert(courseLevels)
    .values([
      {
        slug: "foundation",
        name: "Foundation",
        levelNumber: 1,
        tagline: "Understanding Purpose",
        accent: "navy",
        icon: "user",
        weeks: 5,
        sortOrder: 1,
        imageUrl: "/images/level-foundation.jpg",
        description:
          "At the foundation level, you will understand the fundamental concept of purpose in all its embodiments for a Kingdom citizen. The sessions and lessons will help you understand why you were born, God's original intention for your life, the source of your significance, fulfillment and influence. You will know how your purpose connects with your God-given destiny, vision, life's assignment, calling, career, gifts, goals, story, personal development and so on. You may have heard about purpose before, but at this level it will redefine purpose like you have never heard it before.",
        outcomes: [
          "Articulate a biblical definition of purpose in your own words",
          "Distinguish purpose from career, ambition and assignment",
          "Map your story as evidence of design",
          "Identify the people and contexts you were shaped to serve",
        ],
      },
      {
        slug: "intermediate",
        name: "Intermediate",
        levelNumber: 2,
        tagline: "Purpose Discovery and Clarity",
        accent: "green",
        icon: "compass",
        weeks: 5,
        sortOrder: 2,
        imageUrl: "/images/level-intermediate.jpg",
        description:
          "At the intermediate level, you will learn the concept of potential and purpose discovery. If you haven't discovered your purpose before getting to this level, you are most likely to discover it, and should you have discovered it before, you will gain the clarity needed for you to fulfil God's purpose for your life. The modules will help you understand you effectively so you can clearly articulate your purpose, hone your message to the world, find your most dominant gifts, craft your story and begin to lead with, and through, purpose. There are coaches who will support you through your clarity sessions on your journey.",
        outcomes: [
          "Complete a guided purpose discovery process",
          "Write a one-sentence purpose statement you can defend",
          "Identify your dominant gifts and the evidence for them",
          "Craft and rehearse your story with a coach",
        ],
      },
      {
        slug: "advanced",
        name: "Advanced",
        levelNumber: 3,
        tagline: "Influence and Impact",
        accent: "purple",
        icon: "star",
        weeks: 5,
        sortOrder: 3,
        imageUrl: "/images/level-advanced.jpg",
        description:
          "At the advanced level, you will learn the principles required for you to own your message to the world and begin to live your life's calling. You will understand how to build a personal brand that effectively propagates the Kingdom mandate and influence, and impact the world with your purpose and begin to create and add value to those around you. We can guarantee that the modules on this level will help you hone your gifts in order to deploy your purpose for God to find expression through you to the world.",
        outcomes: [
          "Build a personal vision and brand that carries your message",
          "Position yourself for the rooms and roles your purpose requires",
          "Design a 12-month kingdom impact plan",
          "Lead a collaborative project with your cohort",
        ],
      },
    ])
    .returning();

  const levelBySlug = Object.fromEntries(levelRows.map((level) => [level.slug, level]));
  type SessionSeed = {
    level: string;
    code: string;
    title: string;
    summary: string;
    focusQuestions: string[];
    format: string;
  };

  const sessionSeeds: SessionSeed[] = [
    {
      level: "foundation",
      code: "PURP 101",
      title: "Understanding Purpose",
      summary:
        "A ground-clearing session. We separate purpose from the noise of ambition, comparison and inherited expectation, and look at what Scripture means when it says you were made on purpose for a purpose.",
      focusQuestions: ["What is purpose, really?", "Why does definition matter before discovery?", "How does purpose differ from assignment?"],
      format: "Experiential presentation + reflection",
    },
    {
      level: "foundation",
      code: "PURP 102",
      title: "Becoming a Person of Value",
      summary:
        "Purpose is carried by character. We look at the interior life that sustains a public assignment, and the small daily choices that make a person valuable to the people they are sent to serve.",
      focusQuestions: ["What makes a person valuable?", "Which habits protect your interior life?", "How do you build value without seeking validation?"],
      format: "Case study + round table",
    },
    {
      level: "foundation",
      code: "PURP 103",
      title: "Purpose and Career: Understanding the Concept of Work",
      summary:
        "Work is not a detour from purpose. We reframe vocation, map your current job onto your assignment and work through the practical question of what to do on Monday.",
      focusQuestions: ["Is my job my purpose?", "How do I serve purpose in an unrelated role?", "When is it time to change work?"],
      format: "Key presentation + peer consultation",
    },
    {
      level: "foundation",
      code: "PURP 104",
      title: "Purpose and Predestination",
      summary:
        "A careful, hopeful conversation about God's sovereignty and human agency. We hold together the truth that you were known before you were formed, with the real freedom and responsibility of your choices.",
      focusQuestions: ["What does it mean to be predestined?", "How does grace meet my decisions?", "What is mine to do and what is God's to do?"],
      format: "Teaching + guided reflection",
    },
    {
      level: "foundation",
      code: "PURP 105",
      title: "Purpose, Ministry and Calling",
      summary:
        "We distinguish the call to follow from the call to a platform. Participants examine how ministry, vocation and daily faithfulness overlap, and begin naming what they are sent to.",
      focusQuestions: ["Is everyone called to ministry?", "How do I test an inward call?", "What is my first assignment?"],
      format: "Round table + testimony",
    },
    {
      level: "intermediate",
      code: "PURP 201",
      title: "Discovering Your Purpose",
      summary:
        "A structured discovery workshop using story, gifting, burden and opportunity. Participants leave with raw material for a purpose statement rather than a vague sense of destiny.",
      focusQuestions: ["Where does my story break and bloom?", "What burden will not leave me?", "What do people consistently receive from me?"],
      format: "Interactive workshop",
    },
    {
      level: "intermediate",
      code: "PURP 202",
      title: "Understanding and Liberating Your Potential",
      summary:
        "We identify the ceilings that keep potential imprisoned — fear, comparison, unhealed history, poor stewardship — and design a specific release plan with an accountability partner.",
      focusQuestions: ["What is capping my capacity?", "Which strengths are undeveloped?", "Who can hold me accountable?"],
      format: "Case study + coaching",
    },
    {
      level: "intermediate",
      code: "PURP 203",
      title: "How Will You Be Remembered?",
      summary:
        "A legacy session. Participants write the eulogy they hope will be true, then reverse-engineer the next 12 months from it. Sobering, clarifying and deeply practical.",
      focusQuestions: ["What do I want said of me?", "What must I stop doing now?", "Which relationships need repair?"],
      format: "Experiential reflection",
    },
    {
      level: "intermediate",
      code: "PURP 204",
      title: "Defining Your Purpose Statement",
      summary:
        "Draft, test and refine a purpose statement in a small group. Coaches give direct feedback on clarity, scope and truthfulness before participants finalise a version.",
      focusQuestions: ["Who is my primary audience?", "What transformation am I sent to bring?", "How will I know it is mine?"],
      format: "Clarity sessions with coaches",
    },
    {
      level: "intermediate",
      code: "PURP 205",
      title: "Walking in Dominion: Defining Your Transformation Story",
      summary:
        "We turn the discovery work into a story you can tell. Participants shape a three-minute transformation story for interviews, pulpits, client rooms and family tables.",
      focusQuestions: ["What changed in me?", "How do I tell it without pride?", "Where will I first tell it?"],
      format: "Story lab + presentation",
    },
    {
      level: "advanced",
      code: "PURP 301",
      title: "Vision Building (Part 1): Understanding Vision",
      summary:
        "Vision as a disciplined act of the imagination under God. We examine the anatomy of vision — burden, picture, pathway and cost — and test a first draft against reality.",
      focusQuestions: ["What picture keeps returning?", "What does it cost?", "Who needs it to be true?"],
      format: "Key presentation + workshop",
    },
    {
      level: "advanced",
      code: "PURP 302",
      title: "Vision Building (Part 2): Principles of Vision",
      summary:
        "From picture to plan. Participants build a 12-month operating plan with measurable milestones, a budget of time, money and attention, and a rhythm of review.",
      focusQuestions: ["What are the milestones?", "What will I stop doing?", "How will I review progress?"],
      format: "Planning lab",
    },
    {
      level: "advanced",
      code: "PURP 303",
      title: "Positioning for Emergence: Manifesting as Sons",
      summary:
        "Preparation, visibility and readiness. We work through personal branding as stewardship, practical positioning, and the character required to stay in the room once you enter it.",
      focusQuestions: ["What room do I need to be in?", "What evidence of my work exists?", "Can my character carry my gift?"],
      format: "Case study + mentoring",
    },
    {
      level: "advanced",
      code: "PURP 304",
      title: "Purpose, Time and Relationships",
      summary:
        "A candid look at the relational economy of purpose: who to walk with, who to release, how to protect time for what matters, and how to build tables instead of stages.",
      focusQuestions: ["Who holds my ladder?", "What relationships drain or fuel me?", "How do I steward seasons?"],
      format: "Round table + coaching",
    },
    {
      level: "advanced",
      code: "PURP 305",
      title: "Becoming Relevant and Impactful",
      summary:
        "A collaborative capstone. Each participant presents a purpose project, receives a panel review and leaves with a 90-day deployment plan and a community of accountability.",
      focusQuestions: ["What will I ship in 90 days?", "Who does it serve?", "How will I know it worked?"],
      format: "Capstone presentations + panel",
    },
  ];

  const sessionRows = await db
    .insert(courseSessions)
    .values(
      sessionSeeds.map((session, index) => ({
        levelId: levelBySlug[session.level].id,
        code: session.code,
        title: session.title,
        summary: session.summary,
        focusQuestions: session.focusQuestions,
        format: session.format,
        sortOrder: index + 1,
        durationMinutes: 90,
      })),
    )
    .returning();

  /* --------------------------------------------------------- Testimonials */
  await db.insert(testimonials).values([
    {
      name: "Joan Kirabo",
      role: "Financial analyst",
      location: "Kampala",
      quote:
        "I came for career clarity and left with a purpose statement, a mentor and a plan. The Foundation level reframed how I see my desk entirely.",
      levelSlug: "foundation",
      sortOrder: 1,
    },
    {
      name: "Peter Muwanga",
      role: "High school teacher",
      location: "Jinja",
      quote:
        "PURP 203 asked me what I wanted said at my funeral. That single session reorganised my relationships and my calendar.",
      levelSlug: "intermediate",
      sortOrder: 2,
    },
    {
      name: "Mercy Adong",
      role: "NGO programme lead",
      location: "Gulu",
      quote:
        "The round tables were the gift. I stopped performing in the room and started learning. My team felt the difference within a month.",
      levelSlug: "intermediate",
      sortOrder: 3,
    },
    {
      name: "Samuel Byaruhanga",
      role: "Entrepreneur",
      location: "Mbarara",
      quote:
        "Advanced level gave me the language for a personal brand that carries my values. I presented my first public vision and closed a partnership the same week.",
      levelSlug: "advanced",
      sortOrder: 4,
    },
    {
      name: "Esther Nakato",
      role: "Worship leader",
      location: "Kampala",
      quote:
        "I had been serving a lot and thinking very little. The clarity sessions helped me see my gifts without exaggeration or apology.",
      levelSlug: "intermediate",
      sortOrder: 5,
    },
  ]);

  /* ------------------------------------------------------------ Resources */
  const resourceRows = await db
    .insert(resources)
    .values([
      {
        slug: "purpose-journal-template",
        title: "The Purpose Journal",
        description:
          "A 15-week reflection companion with weekly prompts, a gifting audit and space to draft your purpose statement. Designed to sit beside every session.",
        type: "template",
        fileFormat: "PDF",
        fileSize: "1.4 MB",
        level: "All levels",
        isFeatured: true,
        downloadCount: 412,
      },
      {
        slug: "five-principles-overview",
        title: "The Five Purpose Principles",
        description:
          "A one-page overview of Identity, Source, Purpose, Potential and Destiny — with the five questions that organise the entire course.",
        type: "guide",
        fileFormat: "PDF",
        fileSize: "620 KB",
        level: "All levels",
        isFeatured: true,
        downloadCount: 986,
      },
      {
        slug: "gifting-audit-worksheet",
        title: "Gifting Audit Worksheet",
        description:
          "Six evidence-based questions that surface your dominant gifts, plus a peer-feedback grid to test what you think is true about yourself.",
        type: "worksheet",
        fileFormat: "PDF",
        fileSize: "540 KB",
        level: "Intermediate",
        downloadCount: 318,
      },
      {
        slug: "vision-plan-12-months",
        title: "Twelve-Month Vision Plan",
        description:
          "The planning canvas used in PURP 302: milestones, time budget, stop-doing list and a quarterly review rhythm.",
        type: "template",
        fileFormat: "PDF",
        fileSize: "780 KB",
        level: "Advanced",
        downloadCount: 174,
      },
      {
        slug: "purpose-and-career-guide",
        title: "Purpose and Career Field Guide",
        description:
          "A practical guide for navigating job decisions when assignment and ambition pull in different directions.",
        type: "guide",
        fileFormat: "PDF",
        fileSize: "1.1 MB",
        level: "Foundation",
        isFeatured: true,
        downloadCount: 529,
      },
      {
        slug: "clarity-coach-session-audio",
        title: "Clarity Coach Session (Audio)",
        description:
          "A 24-minute guided clarity session you can walk with: the three questions, the pause, and the written commitment.",
        type: "audio",
        fileFormat: "MP3",
        fileSize: "18 MB",
        level: "Intermediate",
        downloadCount: 133,
      },
    ])
    .returning();

  /* ------------------------------------------------------------- Articles */
  type ArticleSeed = {
    slug: string;
    title: string;
    subtitle?: string;
    excerpt: string;
    category: string;
    author: { id: string };
    status: "draft" | "submitted" | "in_review" | "revision_requested" | "approved" | "scheduled" | "published" | "archived";
    featured: boolean;
    cover: string;
    publishedAt?: Date;
    scheduledFor?: Date;
    readingMinutes: number;
    tags: string[];
    body: string;
  };

  const articleSeeds: ArticleSeed[] = [
    {
      slug: "the-question-that-reorders-a-life",
      title: "The question that reorders a life",
      subtitle: "Why \u201cwho am I?\u201d comes before \u201cwhat should I do?\u201d",
      excerpt:
        "Most of us begin with the second question — the job, the role, the platform. Purpose begins with the first. Here is what changes when identity leads assignment.",
      category: "identity",
      author: editor,
      status: "published" as const,
      featured: true,
      cover: IMG.journal,
      publishedAt: daysAgo(4),
      readingMinutes: 7,
      tags: ["identity", "purpose-discovery", "clarity"],
      body: `There is a question that arrives quietly, usually in the middle of a working week, and it does not leave: **what am I actually for?**

We usually answer it with a role. Teacher. Founder. Analyst. Pastor. Mother. And every one of those answers is true and none of them is enough, because a role is something you do and purpose is something you are sent to be.

## The order matters

In the purpose discovery work we do at Foundation level, we begin with identity — *who am I?* — because every other principle depends on it. If you begin with assignment, you will measure yourself by output. If you begin with identity, you can hold output loosely without holding it cheaply.

> You cannot build a stable life on a borrowed definition of yourself.

This is not a self-help exercise. It is a theological one. The claim of the gospel is that you were known, named and loved before you did anything of consequence. Your value is not a performance metric.

## Three practical shifts

- **From performance to presence.** Ask what you are like to be around when you have nothing to show. That person is the one who goes into the room with you.
- **From comparison to contribution.** Comparison is a tax on attention. Contribution is the discipline of asking what is actually mine to carry.
- **From identity statements to identity questions.** Certainty without curiosity hardens into pride. Stay in the question long enough for the answer to become yours.

## What happens next

When identity leads, the questions change shape. Career stops being a verdict and becomes a venue. Ambition stops being an identity and becomes an instrument. You can pursue promotion without being consumed by it, and you can walk away from a title without losing yourself.

:::callout Start here: write your answer to \u201cWho am I?\u201d in three sentences — no roles allowed. Then read it aloud to someone who knows you well and let them respond.

That is not a motivational exercise. It is the first act of a purposeful life: naming what is already true before you try to become anything else.`,
    },
    {
      slug: "identity-before-assignment",
      title: "Identity before assignment: you are not what you do",
      subtitle: "The interior life that can carry a public purpose",
      excerpt:
        "A public assignment will eventually reveal the private foundation beneath it. Here is how to build the foundation first, and what happens when you skip it.",
      category: "identity",
      author: author,
      status: "published" as const,
      featured: true,
      cover: IMG.listening,
      publishedAt: daysAgo(11),
      readingMinutes: 6,
      tags: ["identity", "leadership", "character"],
      body: `In PURP 102 we say something that unsettles almost every cohort: **becoming a person of value is a different project from becoming a person of visibility.**

Visibility rewards the wrong things. It rewards the clean answer, the strong room and the early launch. Value rewards the patient thing — the follow-through nobody claps for, the apology made quickly, the work done when it would have been easier to be impressive.

## The unglamorous test

Here is the test we use in class. Ask three people who live with you: *what am I like when I am tired?* Their answer is closer to your character than your LinkedIn summary ever will be.

- Tired-you still keeps promises.
- Tired-you does not punishingly withdraw.
- Tired-you can receive feedback without rehearsing your defence.

If the answer troubles you, that is not a reason to be ashamed. It is a reason to start earlier than you planned.

> Character is what your assignment will eventually rest on. Build it while the stakes are low and the room is small.

## The hidden architecture

We often tell participants that purpose is not a ladder, it is a foundation. Ladders get climbed; foundations get tested. A foundation does not look impressive in photographs and it is the reason the house survives the rain.

The Foundation level exists for this reason. Five sessions on identity, work, predestination and calling are not a detour from strategy. They are the loader-bearing wall of everything you will build later.

:::callout This week: choose one interior habit that no one will notice — a morning pause, a Sunday review, a weekly apology practice — and keep it for thirty days before you tell anyone.`,
    },
    {
      slug: "where-you-come-from",
      title: "Where you come from is not where you are from",
      subtitle: "On source, heritage and the courage to receive",
      excerpt:
        "The Source principle asks where you are from — not as geography but as inheritance. Some of us have much to receive and some have much to grieve.",
      category: "source",
      author: admin,
      status: "published" as const,
      featured: true,
      cover: IMG.garden,
      publishedAt: daysAgo(18),
      readingMinutes: 6,
      tags: ["identity", "prayer", "relationships"],
      body: `Source is the quietest of the five principles and perhaps the most neglected. We ask it plainly: **where am I from?**

Not simply in geography, though that matters. We are asking about the streams that formed you — the grandparents, the town, the church, the language, the losses. Your purpose has lineage.

## Two postures

There are two ways to relate to where you come from, and both can be holy.

1. **Receiving.** Some have an inheritance of faith, education or trade. The work is gratitude and stewardship rather than novelty.
2. **Grieving and choosing.** Others have inheritance they must lay down. The work is honest grief, forgiveness, and the deliberate choice to become a different starting point for those who come after.

Most of us live in both. Parts of our story are gifts to be unwrapped; other parts require the courage to say *this ends here.*

> You cannot steward a source you will not name.

## Practising source

A participant once told us that naming her source changed how she prayed: *I stopped asking to become someone else and started giving thanks for what I had been given.* That is the work of PURP 205 — walking in dominion by defining your transformation story.

If you want a starting point, list the people and places that made you and write beside each one whether you have received it fully, partially, or not at all. Then bring the list to God with one sentence per name. That is not sentimentality; it is the foundation of a non-anxious life.`,
    },
    {
      slug: "potential-is-a-stewardship",
      title: "Potential is a stewardship, not a personality trait",
      subtitle: "Why 'you have so much potential' can be a burden",
      excerpt:
        "Potential is often used as a compliment and experienced as a weight. The Intermediate level treats it as capacity entrusted for service — with a release plan.",
      category: "potential",
      author: editor,
      status: "published" as const,
      featured: true,
      cover: IMG.summit,
      publishedAt: daysAgo(26),
      readingMinutes: 7,
      tags: ["gifts", "leadership", "work"],
      body: `Potential is one of the most common words in ministry and one of the most poorly defined. When we say *you have so much potential*, we often mean *you are not yet doing what I imagine for you.* The person hearing it experiences a debt they cannot repay.

At Intermediate level we replace the compliment with a stewardship question: **what has actually been entrusted to you, and how is it being managed?**

## Capacity has a shape

Potential is not infinite. It has a shape, a limit and a direction. A violin has enormous potential in the hands of a violinist and very little in the hands of a welder. Discovering your shape is the work of PURP 202.

- What do people consistently receive from you?
- Which work makes you more patient rather than more frantic?
- Where have you been fruitful without needing to be praised?
- What would your closest friends identify as your most developed strength?

## The liberation

The doctrine of stewardship sets you free from two exhausting errors: pretending you can do everything, and despising what you can actually do.

> You are not responsible for universal potential. You are responsible for the portion in your hands.

Write down your three most evidenced strengths, and one boundary that protects them. Then ask who benefits when those strengths are deployed this month. That is the beginning of a plan, and the end of at least one comparison.`,
    },
    {
      slug: "vision-is-built-twice",
      title: "Vision is built twice: in secret, then in public",
      subtitle: "The principles behind PURP 301 and 302",
      excerpt:
        "Vision is not a mood board. It is a burden with a picture, a pathway and a cost. Here is how advanced participants move from picture to twelve-month plan.",
      category: "destiny",
      author: author,
      status: "published" as const,
      featured: false,
      cover: IMG.summitSunrise,
      publishedAt: daysAgo(33),
      readingMinutes: 8,
      tags: ["vision", "leadership", "legacy"],
      body: `A vision that cannot survive a budget meeting is not yet vision. It is atmosphere.

In the Advanced level we insist that vision is built twice: first in the quiet, where the burden and the picture are formed; then in the open, where the plan is tested by real people, real money and real calendars.

## The anatomy of vision

Every sustainable vision we have seen carries four parts:

1. **Burden** — a need you cannot stop noticing.
2. **Picture** — a specific, describable future, not a slogan.
3. **Pathway** — the first three steps, with names and dates.
4. **Cost** — what it will require from you and from others.

If any one is missing, the other three distort. Vision without cost becomes fantasy. Cost without picture becomes drudgery.

> Write your vision as a description of a normal Tuesday five years from now. If you cannot picture a Tuesday, you have a slogan.

## From picture to plan

PURP 302 builds the operating plan: twelve months, three milestones, one weekly rhythm, one quarterly review, and a stop-doing list. We ask participants to give every milestone a person — who does it with you? — and a price — what has to be released?

## The public test

Then we make it public, carefully. The capstone in PURP 305 is a ninety-day deployment plan presented to a panel who will ask uncomfortable, loving questions. Some plans shrink. Some plans sharpen. A few plans leave the room and change the room.

:::callout Before you build the plan, write the burden in one sentence without any religious vocabulary. Clarity is a form of honesty.`,
    },
    {
      slug: "purpose-and-career-the-false-choice",
      title: "Purpose and career: the false choice",
      subtitle: "What to do on Monday when assignment and ambition disagree",
      excerpt:
        "You do not have to pick between a purposeful life and a serious career. But you do have to be honest about what each is for.",
      category: "purpose",
      author: admin,
      status: "published" as const,
      featured: false,
      cover: IMG.roundTable,
      publishedAt: daysAgo(41),
      readingMinutes: 7,
      tags: ["work", "calling", "clarity"],
      body: `One of the most common questions in Foundation is some version of this: *should I leave my job to follow my purpose?* It is a good question asked in the wrong order.

## Three categories, not two

We find it useful to separate three things that people collapse into one:

- **Assignment** — the enduring reason you are here; it outlasts roles.
- **Vocation** — the field or craft through which assignment is expressed.
- **Position** — the current seat, with its manager, salary and constraints.

The false choice appears when someone treats her position as her assignment. If the position ends, she assumes the assignment has failed. It has not. The seat changed.

> Purpose is not usually about escaping your workplace. It is about changing why you are there.

## Questions that produce clarity

- What is my current position uniquely able to teach me?
- Who is in front of me that I am sent to serve right now?
- Which parts of my role exhaust me for no return — and are they the work or the environment?
- What would a purposeful version of this same job look like in ninety days?

## When leaving is right

Sometimes the answer is a transition, and it is not a failure of faith. Our guidance: do not leave only to be free of something. Leave toward a named burden, with a plan, at least one person who knows your character, and enough margin to make the next decision well.

The point of PURP 103 is not that you should resign. It is that work is not a detour from purpose. It is a workshop for it.`,
    },
    {
      slug: "the-discipline-of-clarity",
      title: "The discipline of clarity: five questions every quarter",
      subtitle: "A practice for people who are serious about direction",
      excerpt:
        "Clarity is not a personality trait. It is a discipline that compounds. Five questions, twenty minutes, once a quarter.",
      category: "purpose",
      author: fellow,
      status: "published" as const,
      featured: false,
      cover: IMG.study,
      publishedAt: daysAgo(52),
      readingMinutes: 5,
      tags: ["clarity", "prayer", "rest"],
      body: `Clarity is usually treated as a moment: the retreat, the conference, the conversation that finally made sense. In practice, clarity is a practice — small, repeated, honest.

## The quarterly five

Put an hour aside. Take a notebook, not a laptop. Answer these in order:

1. **What did I give my best hours to this season?** Look at the calendar, not your intentions.
2. **What has become true that I have not admitted?** The place where your life and your story have stopped matching.
3. **Who did I serve, and who did I avoid?** Purpose always has a direction and a cost.
4. **What will I stop in the next ninety days?** Subtraction is the most under-used planning tool.
5. **What is the one thing only I can do now?** Not the most urgent thing. The most assigned thing.

> The point is not a perfect answer. The point is not living on autopilot for three months at a time.

## Making it stick

Pair it with something you already do — a seasonal change, a birthday, the start of a term. Tell one person what you decided. Keep the notes; in two years the pattern will be your most useful data.

Clarity is a kindness you do for the people you lead. A leader who has not reflected will always export their unfinished business.`,
    },
    {
      slug: "walking-in-dominion-without-losing-tenderness",
      title: "Walking in dominion without losing tenderness",
      subtitle: "Authority is safest in the hands of the gentle",
      excerpt:
        "PURP 205 uses the language of dominion. It is a strong word, and it needs a strong safeguard: a transformed story and a soft heart.",
      category: "potential",
      author: author,
      status: "scheduled" as const,
      scheduledFor: daysAhead(3, 8),
      featured: false,
      cover: IMG.conversation,
      readingMinutes: 6,
      tags: ["leadership", "identity", "relationships"],
      body: `Dominion is a strong word. It appears early in Scripture — before the fall, before the failure, before anyone had a title. And it is given, not seized.

At Intermediate level we ask participants to define their transformation story, and one of the reasons is defensive: people who cannot tell a truthful story about themselves will borrow power to manage the silence.

## The gentleness test

Here is a simple test of whether dominion is being exercised well: **does your authority make it easier or harder for the people around you to tell the truth?**

- Can a junior colleague disagree with you without paying for it?
- Do people bring you problems early or late?
- When you are disappointed, is the room safe?

> Power that cannot receive a correction is power in the process of becoming cruel.

## A transformed story

A transformed story is not a highlight reel with spiritual captions. It names what was broken, what God did, what is still being repaired and what it all cost. It is honest enough that another person can stand inside it and recognise their own life.

Write yours in three hundred words. Remove every adjective that flatters you. Read it to one person who was there. Then use it only to serve, never to perform — and the strength of the word dominion will remain gentle in your hands.`,
    },
    {
      slug: "what-a-round-table-teaches",
      title: "What a round table teaches that a lecture cannot",
      subtitle: "Notes from a facilitation experiment",
      excerpt:
        "Purpose Course lessons are presented in key presentations, case studies, round tables and transformational engagements. This is why the table matters.",
      category: "source",
      author: admin,
      status: "in_review" as const,
      featured: false,
      cover: IMG.workshop,
      readingMinutes: 6,
      tags: ["community", "leadership", "learning"],
      body: `We describe our learning design in five words: experiential learning approach, key presentations, case studies, round tables, transformational engagements. The last two do the work that content cannot.

## What a lecture can do

A lecture can deliver a definition. It can model a framework. It can give a room common language, and for that reason we will not abandon it. But a lecture cannot make the room participate in its own discovery.

At a round table, six people with six different lives have to answer the same question. Someone will disagree. Someone will cry. Someone will state plainly what the rest are avoiding.

## Ground rules we use

- Speak from your own experience, not your opinion about other people's.
- Ask before advising.
- Confidentiality is not optional; what is said in the circle stays.
- Silence is a contribution; do not fill it for someone else.

> Transformation happens in the gap between what we say we believe and what someone else noticed.

## Design implications

When we build the live online learning platform, the round table is our benchmark, not our afterthought. Breakout rooms, shared notes, live prompts and small group coaches are not features to add later. They are the pedagogy.`,
    },
    {
      slug: "naming-your-gifts-without-exaggerating",
      title: "Naming your gifts without exaggerating them",
      subtitle: "A working draft for the gifting audit",
      excerpt:
        "A draft in the editorial pipeline exploring the difference between gifting, skill and preference.",
      category: "potential",
      author: editor,
      status: "draft" as const,
      featured: false,
      cover: IMG.study,
      readingMinutes: 4,
      tags: ["gifts", "work"],
      body: `Draft notes.

Gifting is not the same as skill, and neither is the same as preference.

- Gifting: capacity given, usually visible to others before it is visible to you.
- Skill: capacity trained, measurable in output.
- Preference: capacity desired, not necessarily possessed.

The audit we use asks for evidence, not adjectives. Anything without evidence goes into the "unknown" column. That column is the most honest part of the page.`,
    },
    {
      slug: "when-your-assignment-feels-smaller",
      title: "When your assignment feels smaller than your ambition",
      subtitle: "On hidden faithfulness and the size of a life",
      excerpt:
        "A piece in revision about ambition, obscurity and the size of a faithful life.",
      category: "destiny",
      author: author,
      status: "revision_requested" as const,
      featured: false,
      cover: IMG.garden,
      readingMinutes: 5,
      tags: ["calling", "leadership", "legacy"],
      body: `There is a particular ache that comes when your days are small and your imagination is not.

We talk about it in PURP 304, usually late, usually after someone has admitted that they expected to be further along. The room goes quiet in a specific way.

Ambition is not the enemy. Unexamined ambition is. It quietly rewrites the definition of faithfulness until nothing you do is enough.

The question we practise is not "how do I get bigger?" but "what does obedience look like at this size?"

Notes to develop: the hidden years, the difference between platform and presence, and a conversation with three participants about a decade of small work.`,
    },
    {
      slug: "building-a-personal-board-of-directors",
      title: "Building a personal board of directors",
      subtitle: "Four seats every purposeful person needs",
      excerpt:
        "No one discovers purpose alone. Here is a simple structure for the people who should have access to your life.",
      category: "purpose",
      author: admin,
      status: "published" as const,
      featured: false,
      cover: IMG.mentorship,
      publishedAt: daysAgo(64),
      readingMinutes: 6,
      tags: ["mentorship", "leadership", "community"],
      body: `The phrase sounds corporate and the practice is ancient. Everyone needs a small number of people with permission to speak into their life.

## Four seats

1. **A mentor** — someone a decade ahead who has already survived what you are facing.
2. **A peer** — someone at your stage who will tell you the truth at speed.
3. **A builder** — someone who makes things with you and can test your ideas in reality.
4. **A truth-teller** — someone who knows your history and is not impressed by your performance.

You are not looking for a fan club. You are building a table where your character and your plan can both be examined.

> Choose people who are not dependent on your approval.

## How to invite someone

Be specific. "Will you be one of four people who has permission to ask me hard questions about this assignment for the next twelve months?" is far better than "let's stay in touch."

Then show up with something to work on. Mentors do not primarily need your admiration. They need your agenda.`,
    },
    {
      slug: "a-letter-to-the-leader-who-is-tired",
      title: "A letter to the leader who is tired",
      subtitle: "Archived: pause, rebuild, return",
      excerpt:
        "An archived pastoral letter kept for reference, about exhaustion, sabbath and the limits of a human being.",
      category: "identity",
      author: editor,
      status: "archived" as const,
      featured: false,
      cover: IMG.listening,
      readingMinutes: 5,
      tags: ["rest", "leadership", "identity"],
      body: `This letter was published during the first cohort and has since been archived. Kept here so the editorial team can reference the tone and structure.

You are tired, and the exhaustion is not a spiritual failure. It may be a design feature.

Limits are not an insult. They are the shape of a creature who needs God and needs other people.

Rest is not a reward for finished work. It is a declaration that the work is not yours to hold up.`,
    },
    {
      slug: "three-habits-that-protect-clarity",
      title: "Three habits that protect a clear purpose",
      subtitle: "A submission from the editorial fellow",
      excerpt:
        "Submitted for editorial review: the small habits that keep direction intact through busy seasons.",
      category: "purpose",
      author: fellow,
      status: "submitted" as const,
      featured: false,
      cover: IMG.journal,
      readingMinutes: 4,
      tags: ["clarity", "prayer", "rest"],
      body: `Submitted draft for review.

Three habits: a weekly written review, a monthly conversation with a truth-teller, and a quarterly subtraction.

Each one is designed to interrupt autopilot rather than add another obligation. Notes for Grace: I would like help with the opening and the closing, and I am unsure about the second habit. Please suggest a revision direction.`,
    },
    {
      slug: "purpose-in-the-family-business",
      title: "Purpose in the family business",
      subtitle: "Approved draft awaiting a publishing slot",
      excerpt:
        "An approved feature on succession, inheritance and calling in family enterprises.",
      category: "source",
      author: admin,
      status: "approved" as const,
      featured: false,
      cover: IMG.garden,
      readingMinutes: 7,
      tags: ["work", "legacy", "relationships"],
      body: `Approved and awaiting scheduling.

The family business is one of the most complicated classrooms for purpose: you inherit relationships, expectations and a name at the same time.

We will serialise this after the current series closes.

Outline: the inheritance question, the competence question, the covenant question.`,
    },
  ];

  const articleRows = await db
    .insert(articles)
    .values(
      articleSeeds.map((seed) => ({
        slug: seed.slug,
        title: seed.title,
        subtitle: seed.subtitle ?? null,
        excerpt: seed.excerpt,
        body: seed.body,
        status: seed.status,
        categoryId: cat[seed.category] ?? null,
        authorId: seed.author.id,
        coverImageUrl: seed.cover,
        coverAlt: seed.title,
        readingMinutes: seed.readingMinutes,
        isFeatured: seed.featured,
        seoTitle: `${seed.title} · Purpose Course`,
        seoDescription: seed.excerpt.slice(0, 158),
        publishedAt: seed.status === "published" ? (seed.publishedAt ?? daysAgo(30)) : null,
        scheduledFor: seed.status === "scheduled" ? (seed.scheduledFor ?? daysAhead(3)) : null,
        archivedAt: seed.status === "archived" ? daysAgo(9) : null,
        createdAt: seed.publishedAt ?? daysAgo(20),
        updatedAt: seed.publishedAt ?? daysAgo(2),
      })),
    )
    .returning();

  const articleBySlug = Object.fromEntries(articleRows.map((row) => [row.slug, row]));

  for (const seed of articleSeeds) {
    const row = articleBySlug[seed.slug];
    await db.insert(articleTags).values(
      seed.tags
        .filter((slug) => tagId[slug])
        .map((slug) => ({ articleId: row.id, tagId: tagId[slug] })),
    );
    await db.insert(articleRevisions).values({
      articleId: row.id,
      editorId: seed.author.id,
      title: seed.title,
      body: seed.body,
      revisionNumber: 1,
      changeNote: "First draft",
      createdAt: seed.publishedAt ?? daysAgo(20),
    });
    await db.insert(articleRevisions).values({
      articleId: row.id,
      editorId: editor.id,
      title: seed.title,
      body: seed.body,
      revisionNumber: 2,
      changeNote: "Editorial pass: tightened the opening, added the callout.",
      createdAt: seed.publishedAt ?? daysAgo(12),
    });

    const reviewSteps: { action: "submitted" | "review_started" | "approved" | "published" | "revision_requested" | "scheduled"; comment?: string }[] = [
      { action: "submitted", comment: "Submitted for the editorial desk." },
    ];
    if (["in_review", "approved", "published", "scheduled", "revision_requested", "archived"].includes(seed.status)) {
      reviewSteps.push({ action: "review_started", comment: "Reading now — structure is strong, checking the middle section." });
    }
    if (seed.status === "revision_requested") {
      reviewSteps.push({
        action: "revision_requested",
        comment:
          "Grace: this is close. Please cut the first 200 words, add one concrete story from a participant, and resubmit by Friday.",
      });
    }
    if (["approved", "published", "scheduled", "archived"].includes(seed.status)) {
      reviewSteps.push({
        action: "approved",
        comment: "Approved for the Purpose series. Excellent clarity in the application section.",
      });
    }
    if (seed.status === "scheduled") {
      reviewSteps.push({ action: "scheduled", comment: "Scheduled to publish in the Thursday Purpose Letter." });
    }
    if (["published", "archived"].includes(seed.status)) {
      reviewSteps.push({ action: "published", comment: "Live on the Purpose Journal." });
    }
    await db.insert(articleReviews).values(
      reviewSteps.map((step) => ({
        articleId: row.id,
        reviewerId: step.action === "submitted" ? seed.author.id : editor.id,
        action: step.action === "review_started" ? ("review_started" as const) : step.action,
        toStatus:
          step.action === "submitted"
            ? ("submitted" as const)
            : step.action === "review_started"
              ? ("in_review" as const)
              : step.action === "revision_requested"
                ? ("revision_requested" as const)
                : step.action === "approved"
                  ? ("approved" as const)
                  : step.action === "scheduled"
                    ? ("scheduled" as const)
                    : ("published" as const),
        comment: step.comment,
        createdAt: seed.publishedAt ?? daysAgo(14),
      })),
    );
  }

  /* ----------------------------------------------------- Site content */
  await db.insert(siteSettings).values([
    { key: "site_name", value: "Purpose Course", label: "Site name" },
    { key: "tagline", value: "Discover. Clarify. Live. Impact.", label: "Tagline" },
    {
      key: "hero_headline",
      value: "You were born for significance.",
      label: "Homepage headline",
    },
    {
      key: "hero_subhead",
      value:
        "A 15-week journey through Identity, Source, Purpose, Potential and Destiny — teaching, reflection and a community that helps you live what you discover.",
      label: "Homepage subheading",
    },
    { key: "contact_email", value: "ssenyondolex@gmail.com", label: "Primary email" },
    {
      key: "contact_email_secondary",
      value: "schoolofpurposeandleadership@gmail.com",
      label: "Secondary email",
    },
    { key: "contact_phone", value: "+256 708 376 997", label: "Phone" },
    { key: "location", value: "Kampala, Uganda · Online worldwide", label: "Location" },
    { key: "cohort_name", value: "Cohort 04 · 2026", label: "Next cohort" },
    { key: "enrollment_status", value: "Interest list open", label: "Enrolment status" },
    { key: "total_weeks", value: "15", label: "Programme duration (weeks)" },
    { key: "newsletter_name", value: "The Purpose Letter", label: "Newsletter name" },
  ]);

  await db.insert(pages).values([
    {
      slug: "about",
      title: "We exist so that purpose is discovered, clarified and lived",
      subtitle: "The story behind Purpose Course and the School of Purpose and Leadership.",
      body: `Purpose Course began as a conversation between friends who kept meeting people with gifts, faith and no clear direction. The course was built to answer a simple question: what would it look like to take purpose discovery seriously — with structure, time, community and honest facilitation?

## What we believe

- **Purpose is discovered, not invented.** It is received before it is pursued.
- **Clarity is a discipline.** It grows through reflection, conversation and feedback.
- **Community is the classroom.** Round tables, case studies and transformational engagements do what content alone cannot.
- **Impact is downstream of identity.** We refuse to separate platform from character.

## How we teach

Lessons are presented in key presentations, case studies, round tables and facilitative transformational engagements — an experiential learning approach across three levels and fifteen sessions.

> From purpose discovery to kingdom impact — you were born for significance.

## Where we are going

We are building a digital publishing platform today, an online academy next, and a live learning community after that: real-time discussions, mentorship appointments, collaborative exercises, progress tracking and notifications. This site is the first expression of that architecture.`,
    },
    {
      slug: "contact",
      title: "Talk to us",
      subtitle: "Questions about the course, the journal or partnership?",
      body: `Email ssenyondolex@gmail.com or schoolofpurposeandleadership@gmail.com. Call +256 708 376 997. We are based in Kampala, Uganda and run cohorts online for participants across East Africa and beyond.`,
    },
  ]);

  await db.insert(navigation).values([
    { label: "Home", href: "/", sortOrder: 1 },
    { label: "The Program", href: "/course", sortOrder: 2 },
    { label: "Journal", href: "/blog", sortOrder: 3 },
    { label: "Resources", href: "/resources", sortOrder: 4 },
    { label: "Community", href: "/community", sortOrder: 5 },
    { label: "About", href: "/about", sortOrder: 6 },
    { label: "Staff login", href: "/login", location: "footer", sortOrder: 1 },
  ]);

  await db.insert(mediaAssets).values([
    { url: IMG.workshop, alt: "Facilitated round table in a bright room", kind: "image", width: 1400, height: 900, uploadedBy: editor.id },
    { url: IMG.study, alt: "Open journal and study notes", kind: "image", width: 1200, height: 800, uploadedBy: admin.id },
    { url: IMG.summit, alt: "Hiker at sunrise on a summit", kind: "image", width: 1200, height: 800, uploadedBy: admin.id },
    { url: IMG.mentorship, alt: "One-to-one mentoring conversation", kind: "image", width: 1200, height: 800, uploadedBy: editor.id },
  ]);

  /* ------------------------------------------------------- Subscribers */
  const subscriberSeeds = [
    ["joan.kirabo@example.com", "Joan Kirabo", "Identity", "blog"],
    ["peter.muwanga@example.com", "Peter Muwanga", "Purpose", "course-waitlist"],
    ["mercy.adong@example.com", "Mercy Adong", "Potential", "newsletter"],
    ["samuel.byaruhanga@example.com", "Samuel Byaruhanga", "Destiny", "blog"],
    ["esther.nakato@example.com", "Esther Nakato", "Source", "resources"],
    ["grace.atim@example.com", "Grace Atim", "Purpose", "newsletter"],
    ["timothy.okumu@example.com", "Timothy Okumu", "Identity", "blog"],
    ["sarah.nabwire@example.com", "Sarah Nabwire", "Potential", "course-waitlist"],
    ["daniel.kato@example.com", "Daniel Kato", "Destiny", "blog"],
    ["rebecca.achieng@example.com", "Rebecca Achieng", "Source", "resources"],
    ["moses.kiyingi@example.com", "Moses Kiyingi", "Purpose", "newsletter"],
    ["lydia.namuli@example.com", "Lydia Namuli", "Identity", "blog"],
    ["brian.owori@example.com", "Brian Owori", "Potential", "newsletter"],
    ["faith.akello@example.com", "Faith Akello", "Destiny", "course-waitlist"],
    ["emmanuel.tumusiime@example.com", "Emmanuel Tumusiime", "Purpose", "blog"],
    ["prossy.namukasa@example.com", "Prossy Namukasa", "Source", "newsletter"],
    ["joshua.mugisha@example.com", "Joshua Mugisha", "Identity", "resources"],
    ["agnes.akot@example.com", "Agnes Akot", "Potential", "newsletter"],
    ["winnie.nansubuga@example.com", "Winnie Nansubuga", "Destiny", "blog"],
    ["charles.wandera@example.com", "Charles Wandera", "Purpose", "blog"],
    ["irene.kyomuhendo@example.com", "Irene Kyomuhendo", "Identity", "newsletter"],
    ["patrick.odongo@example.com", "Patrick Odongo", "Potential", "course-waitlist"],
    ["aisha.nakimera@example.com", "Aisha Nakimera", "Source", "blog"],
    ["benjamin.ekiru@example.com", "Benjamin Ekiru", "Destiny", "newsletter"],
  ] as const;

  await db.insert(subscribers).values(
    subscriberSeeds.map(([email, fullName, principle, source], index) => ({
      email,
      fullName,
      principle,
      source,
      createdAt: daysAgo(index + 1, 10),
    })),
  );

  /* ------------------------------------------- Enrollments and progress */
  const enrollmentRows = await db
    .insert(enrollments)
    .values([
      { email: "joan.kirabo@example.com", fullName: "Joan Kirabo", levelId: levelBySlug.intermediate.id, cohort: "Cohort 03 · 2025", status: "completed", createdAt: daysAgo(120) },
      { email: "peter.muwanga@example.com", fullName: "Peter Muwanga", levelId: levelBySlug.foundation.id, cohort: "Cohort 03 · 2025", status: "enrolled", createdAt: daysAgo(90) },
      { email: "mercy.adong@example.com", fullName: "Mercy Adong", levelId: levelBySlug.intermediate.id, cohort: "Cohort 04 · 2026", status: "enrolled", createdAt: daysAgo(40) },
      { email: "samuel.byaruhanga@example.com", fullName: "Samuel Byaruhanga", levelId: levelBySlug.advanced.id, cohort: "Cohort 04 · 2026", status: "enrolled", createdAt: daysAgo(35) },
      { email: "esther.nakato@example.com", fullName: "Esther Nakato", levelId: levelBySlug.foundation.id, cohort: "Cohort 04 · 2026", status: "waitlist", createdAt: daysAgo(12) },
      { email: "sarah.nabwire@example.com", fullName: "Sarah Nabwire", levelId: levelBySlug.foundation.id, cohort: "Cohort 04 · 2026", status: "waitlist", createdAt: daysAgo(6) },
      { email: "faith.akello@example.com", fullName: "Faith Akello", levelId: levelBySlug.advanced.id, cohort: "Cohort 04 · 2026", status: "waitlist", createdAt: daysAgo(3) },
    ])
    .returning();

  const enrolledSample = enrollmentRows[1];
  await db.insert(learningProgress).values(
    sessionRows.slice(0, 3).map((session, index) => ({
      enrollmentId: enrolledSample.id,
      sessionId: session.id,
      completed: index < 2,
      completedAt: index < 2 ? daysAgo(10 - index) : null,
    })),
  );

  /* ---------------------------------------------------------- Community */
  const groupRows = await db
    .insert(discussionGroups)
    .values([
      {
        slug: "purpose-lounge",
        name: "Purpose Lounge",
        description: "Open conversation for readers and participants. Bring an honest question.",
        accent: "gold",
      },
      {
        slug: "foundation-cohort",
        name: "Foundation Cohort",
        description: "Members of the current Foundation level — session notes, questions and accountability.",
        accent: "navy",
        isMembersOnly: true,
      },
      {
        slug: "mentorship-circle",
        name: "Mentorship Circle",
        description: "Coaching prompts, clarity session reflections and mentor office hours.",
        accent: "teal",
        isMembersOnly: true,
      },
    ])
    .returning();

  const threadRows = await db
    .insert(discussionThreads)
    .values([
      {
        groupId: groupRows[0].id,
        title: "What did PURP 102 change about how you see your work?",
        prompt:
          "We spent the whole session on becoming a person of value. Share one thing you are practising this week — no theory, just the practice.",
        authorName: "Daniel Okello",
        authorId: author.id,
        isPinned: true,
        replyCount: 2,
        lastActivityAt: daysAgo(0, 8),
        createdAt: daysAgo(2),
      },
      {
        groupId: groupRows[1].id,
        title: "Foundation cohort: posting our identity statements",
        prompt:
          "Write the three sentences — no roles allowed. Post them here if you are comfortable, and give one another honest encouragement.",
        authorName: "Alex Ssenyondo",
        authorId: admin.id,
        replyCount: 2,
        lastActivityAt: daysAgo(0, 11),
        createdAt: daysAgo(4),
      },
      {
        groupId: groupRows[2].id,
        title: "Mentor office hours: how do I test a burden before I build?",
        prompt:
          "I have a burden for vocational training among school leavers, but I do not want to launch something sentimental. What would a faithful experiment look like in 90 days?",
        authorName: "Sarah Nabwire",
        authorId: null,
        replyCount: 1,
        lastActivityAt: daysAgo(1, 15),
        createdAt: daysAgo(3),
      },
      {
        groupId: groupRows[0].id,
        title: "Reading group: 'The question that reorders a life'",
        prompt:
          "Grace's article landed hard. Which line are you still thinking about, and what are you going to do about it?",
        authorName: "Grace Namusoke",
        authorId: editor.id,
        isPinned: false,
        replyCount: 1,
        lastActivityAt: daysAgo(5),
        createdAt: daysAgo(6),
      },
    ])
    .returning();

  await db.insert(discussionPosts).values([
    {
      threadId: threadRows[0].id,
      authorName: "Mercy Adong",
      body: "I stopped answering email between 6 and 8 in the morning. It sounds small but I am a different person by 9am. My team noticed before I told them.",
      createdAt: daysAgo(1, 7),
    },
    {
      threadId: threadRows[0].id,
      authorName: "Peter Muwanga",
      body: "I asked my wife what I am like when I am tired. That was a brave question and an uncomfortable answer. Working on the apology practice from session two.",
      createdAt: daysAgo(0, 8),
    },
    {
      threadId: threadRows[1].id,
      authorName: "Esther Nakato",
      body: "I am a daughter of the Most High, a learner who notices people, and a woman sent to make rooms gentler. Three sentences, no roles. That took me four days.",
      createdAt: daysAgo(1, 13),
    },
    {
      threadId: threadRows[1].id,
      authorName: "Alex Ssenyondo",
      body: "Esther — the third sentence is an assignment, not a role. Keep it where you can see it. Who is the first person you will practise it on this week?",
      createdAt: daysAgo(0, 11),
    },
    {
      threadId: threadRows[2].id,
      authorName: "Grace Namusoke",
      body: "Run a two-week listening cohort with six employers. Do not build the curriculum until you have heard the words they use about school leavers. That is a cheap faithful test.",
      createdAt: daysAgo(1, 15),
    },
    {
      threadId: threadRows[3].id,
      authorName: "Joan Kirabo",
      body: "The line about performance metrics. I have been measuring my value in response times. I am unlearning that in public.",
      createdAt: daysAgo(5),
    },
  ]);

  /* --------------------------------------------------- Notifications/logs */
  await db.insert(notifications).values([
    {
      recipientId: editor.id,
      type: "review",
      title: "New submission from Ruth Achieng",
      body: "Three habits that protect a clear purpose is waiting for a first read.",
      href: "/admin/reviews",
      createdAt: daysAgo(1),
    },
    {
      recipientId: admin.id,
      type: "publish",
      title: "Scheduled article goes live in 3 days",
      body: "Walking in dominion without losing tenderness is queued for Thursday.",
      href: "/admin/articles",
      createdAt: daysAgo(1, 14),
    },
    {
      recipientId: author.id,
      type: "review",
      title: "Revision requested",
      body: "Grace left notes on “When your assignment feels smaller”.",
      href: "/admin/articles",
      createdAt: daysAgo(2),
    },
    {
      recipientId: editor.id,
      type: "community",
      title: "New question in the Mentorship Circle",
      body: "Sarah Nabwire asked for a 90-day experiment.",
      href: "/community",
      isRead: true,
      createdAt: daysAgo(2),
    },
  ]);

  const logEntries = [
    ["article.created", "Created the draft “Naming your gifts without exaggerating them”.", author.id],
    ["article.submitted", "Submitted “Three habits that protect a clear purpose” for review.", fellow.id],
    ["article.start_review", "Moved “What a round table teaches” into editorial review.", editor.id],
    ["article.scheduled", "Scheduled “Walking in dominion without losing tenderness”.", editor.id],
    ["article.revision_requested", "Requested revisions on “When your assignment feels smaller”.", editor.id],
    ["newsletter.import", "Imported 24 subscribers from the cohort interest list.", admin.id],
    ["resource.published", "Published the Twelve-Month Vision Plan.", editor.id],
    ["community.reply", "Replied in the Purpose Lounge reading group.", editor.id],
  ] as const;

  await db.insert(activityLogs).values(
    logEntries.map(([action, description, actorId], index) => ({
      actorId,
      action,
      entityType: action.split(".")[0],
      description,
      createdAt: daysAgo(index, 11),
    })),
  );

  await db.insert(resourceDownloads).values(
    resourceRows.slice(0, 3).flatMap((resource, resourceIndex) =>
      Array.from({ length: resourceIndex + 2 }).map((_, index) => ({
        resourceId: resource.id,
        email: subscriberSeeds[index][0],
        createdAt: daysAgo(index + resourceIndex + 1),
      })),
    ),
  );

  /* ------------------------------------------- Academy: mentor & student */
  const studentEnrollmentId = enrollmentRows[0].id;
  await db
    .update(enrollments)
    .set({
      profileId: student.id,
      levelId: levelBySlug.intermediate.id,
      cohort: "Cohort 04 · 2026",
      status: "enrolled",
    })
    .where(eq(enrollments.id, studentEnrollmentId));

  const intermediateSessions = sessionRows.filter((session) => session.levelId === levelBySlug.intermediate.id);

  await db.insert(learningProgress).values(
    intermediateSessions.map((session, index) => ({
      enrollmentId: studentEnrollmentId,
      sessionId: session.id,
      completed: index < 2,
      completedAt: index < 2 ? daysAgo(21 - index * 7) : null,
    })),
  );

  const assignmentRows = await db
    .insert(assignments)
    .values([
      {
        levelId: levelBySlug.intermediate.id,
        sessionId: intermediateSessions[3]?.id ?? null,
        title: "Define your purpose statement",
        brief:
          "Draft a single sentence that names who you serve, the transformation you bring and the evidence that this is yours. Bring two versions to your clarity session with Coach Miriam.",
        dueAt: daysAhead(4),
        sortOrder: 1,
      },
      {
        levelId: levelBySlug.intermediate.id,
        sessionId: intermediateSessions[0]?.id ?? null,
        title: "Gifting audit — peer evidence",
        brief:
          "Ask three people who have worked with you for one specific example of each gift you claim. Summarise the evidence and flag anything you cannot evidence yet.",
        isCollaborative: true,
        dueAt: daysAhead(9),
        sortOrder: 2,
      },
      {
        levelId: levelBySlug.intermediate.id,
        sessionId: intermediateSessions[2]?.id ?? null,
        title: "Write your transformation story",
        brief:
          "Three hundred words. Name what was broken, what changed, what is still being repaired and what it cost. Remove every adjective that flatters you.",
        dueAt: daysAhead(16),
        sortOrder: 3,
      },
    ])
    .returning();

  await db.insert(assignmentSubmissions).values([
    {
      assignmentId: assignmentRows[1].id,
      profileId: student.id,
      status: "submitted",
      submittedAt: daysAgo(1, 19),
      body: `Evidence gathered from three colleagues.

1. Teaching / explaining: my team lead described the onboarding session I rewrote as "the first time the process made sense". Two people asked me to walk them through the model again.
2. Administration: I built the reconciliation sheet the department still uses. Nobody asked me to; I noticed the errors and fixed the pattern.
3. Encouragement: a junior analyst said I was the person who told her the truth without making her feel small.

Cannot evidence yet: public speaking beyond a small room. I avoid it and I know why.`,
      updatedAt: daysAgo(1, 19),
    },
    {
      assignmentId: assignmentRows[2].id,
      profileId: student.id,
      status: "reviewed",
      submittedAt: daysAgo(9),
      reviewedAt: daysAgo(7),
      reviewedById: mentor.id,
      feedback:
        "Strong and honest. The paragraph about your father's business is doing real work — keep it. Cut the first two sentences (they explain rather than tell) and name the cost in one plain sentence. Bring the revised version to our next session.",
      body: `Draft transformation story: I spent five years trying to be the most useful person in every room because I did not believe I could be the most truthful one.`,
      updatedAt: daysAgo(7),
    },
  ]);

  await db.insert(coachingSessions).values([
    {
      mentorId: mentor.id,
      studentId: student.id,
      enrollmentId: studentEnrollmentId,
      title: "Clarity session — purpose statement review",
      focus: "Two drafts of the purpose statement, plus the gifting evidence gathered from colleagues.",
      status: "scheduled",
      scheduledAt: daysAhead(3, 15),
      durationMinutes: 45,
    },
    {
      mentorId: mentor.id,
      studentId: student.id,
      enrollmentId: studentEnrollmentId,
      title: "Story lab — transformation story feedback",
      focus: "Bring the 300-word story and be ready to read it aloud without apologising.",
      status: "requested",
      scheduledAt: daysAhead(8, 11),
      durationMinutes: 45,
    },
    {
      mentorId: mentor.id,
      studentId: student.id,
      enrollmentId: studentEnrollmentId,
      title: "Discovery call — why clarity feels urgent now",
      focus: "Naming the transitions that made this the right season to do the work.",
      status: "completed",
      scheduledAt: daysAgo(12, 14),
      durationMinutes: 45,
      mentorNotes:
        "Clear burden for vocational training among school leavers. Gifts evidenced in teaching and administration. Homework: rewrite the story in 300 words, remove every self-flattering adjective, and note the first place you will tell it.",
    },
  ]);

  await db.insert(reflections).values([
    {
      authorProfileId: student.id,
      enrollmentId: studentEnrollmentId,
      sessionId: intermediateSessions[1]?.id ?? null,
      prompt: "What is capping my capacity?",
      body: "I keep calling it humility when it is really fear of being seen making a decision. The gifting audit made that difficult to avoid: the evidence is there, and I have been treating it as luck.",
      visibility: "mentor",
      createdAt: daysAgo(2, 21),
    },
    {
      authorProfileId: student.id,
      enrollmentId: studentEnrollmentId,
      sessionId: intermediateSessions[0]?.id ?? null,
      prompt: "Where does my story break and bloom?",
      body: "It breaks in the year I was asked to lead a team I had no language for. It blooms in the same year, because I learned to ask questions instead of pretending to know.",
      visibility: "private",
      createdAt: daysAgo(16, 20),
    },
  ]);

  await db.insert(notifications).values([
    {
      recipientId: student.id,
      type: "review",
      title: "Feedback on your transformation story",
      body: "Coach Miriam reviewed your story and left notes.",
      href: "/learn/assignments",
      createdAt: daysAgo(7),
    },
    {
      recipientId: student.id,
      type: "review",
      title: "Coaching session confirmed",
      body: "Clarity session — purpose statement review is confirmed.",
      href: "/learn/mentor",
      createdAt: daysAgo(1, 9),
    },
    {
      recipientId: mentor.id,
      type: "review",
      title: "Assignment ready for review",
      body: "Joan Kirabo submitted “Gifting audit — peer evidence”.",
      href: "/mentor/submissions",
      createdAt: daysAgo(1, 19),
    },
    {
      recipientId: mentor.id,
      type: "review",
      title: "New coaching request",
      body: "Joan Kirabo requested “Story lab — transformation story feedback”.",
      href: "/mentor/sessions",
      createdAt: daysAgo(2),
    },
  ]);

  await db.insert(activityLogs).values([
    {
      actorId: student.id,
      action: "learning.assignment_submitted",
      entityType: "assignment",
      description: "Submitted “Gifting audit — peer evidence” for review.",
      createdAt: daysAgo(1, 19),
    },
    {
      actorId: mentor.id,
      action: "mentorship.submission_reviewed",
      entityType: "assignment",
      description: "Reviewed “Write your transformation story” and left feedback.",
      createdAt: daysAgo(7),
    },
    {
      actorId: mentor.id,
      action: "mentorship.session_completed",
      entityType: "coaching_session",
      description: "Completed the discovery call with Joan Kirabo and recorded notes.",
      createdAt: daysAgo(12),
    },
  ]);

  const academy = await seedAcademyContent();
  const assessmentSeed = await seedAssessments();
  const platform = await seedPlatform();
  console.log(`Platform: ${platform.instruments} instruments, ${platform.communities} communities, ${platform.cohortWeeks}-week cohort.`);
  const enterprise = await seedEnterprise();
  console.log(`Enterprise: ${enterprise.permissions} permissions, ${enterprise.achievements} achievements, ${enterprise.events} events.`);

  console.log(`Academy: ${academy.courses} courses, ${academy.liveSessions} live sessions, ${assessmentSeed.levelExams} level exams.`);

  console.log(
    `Seeded ${profileRows.length} profiles, ${articleRows.length} articles, ${sessionRows.length} sessions, ${subscriberSeeds.length} subscribers.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
