import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  courseLevels,
  courseModules,
  courses,
  lessonProgress,
  lessons,
  liveMessages,
  liveRsvps,
  liveSessions,
  profiles,
  roles,
} from "./schema";

const IMG = {
  workshop: "/images/hero-workshop.jpg",
  study: "/images/student-study.jpg",
  journal: "/images/journal-purpose.jpg",
  summit: "/images/level-advanced.jpg",
  mentorship: "/images/mentorship.jpg",
  roundTable: "/images/community.jpg",
  garden: "/images/level-foundation.jpg",
  listening: "/images/community.jpg",
  identity: "/images/journal-identity.jpg",
  intermediate: "/images/level-intermediate.jpg",
};

const VIDEO = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";
const AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3";
const daysAhead = (days: number, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const daysAgo = (days: number, hour = 9) => daysAhead(-days, hour);

type LessonSeed = {
  title: string;
  kind: "video" | "audio" | "reading" | "illustration" | "download" | "practice" | "live";
  summary: string;
  body: string;
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  downloadUrl?: string;
  downloadLabel?: string;
  practicePrompt?: string;
  durationMinutes?: number;
  isPreview?: boolean;
};

type ModuleSeed = {
  title: string;
  summary: string;
  sessionCode?: string;
  estimatedMinutes: number;
  isPreview?: boolean;
  lessons: LessonSeed[];
};

type CourseSeed = {
  level: string;
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  description: string;
  cover: string;
  accent: string;
  hours: number;
  status: "published" | "draft";
  isSequential: boolean;
  modules: ModuleSeed[];
};

const COURSES: CourseSeed[] = [
  {
    level: "foundation",
    slug: "understanding-purpose",
    title: "Understanding Purpose",
    subtitle: "Why you were born — the ground floor of the whole programme",
    summary:
      "Five modules that separate purpose from ambition, map your story and give you language for the assignment on your life.",
    description:
      "This course is the Foundation level in structured form. Video teaching gives you the framework, audio reflections slow you down, illustrations anchor the ideas, and every module closes with a downloaded worksheet and a practice you can complete in a normal week.",
    cover: IMG.garden,
    accent: "navy",
    hours: 5,
    status: "published",
    isSequential: true,
    modules: [
      {
        title: "What purpose actually is",
        summary: "Definitions before discovery — clearing the ground for the rest of the course.",
        sessionCode: "PURP 101",
        estimatedMinutes: 42,
        isPreview: true,
        lessons: [
          {
            title: "Watch: purpose is received before it is pursued",
            kind: "video",
            summary: "A twelve-minute key presentation on definition, design and assignment.",
            videoUrl: VIDEO,
            imageUrl: IMG.workshop,
            imageAlt: "Facilitated purpose session with participants",
            durationMinutes: 14,
            isPreview: true,
            body: `## Why definition comes first

Most people pursue purpose before they have defined it. The result is a life measured by movement rather than direction.

In this lesson we separate three words that are often collapsed into one:

- **Purpose** — the enduring reason you are here. It does not change with a job.
- **Assignment** — the specific work purpose requires in a season.
- **Vocation** — the field or craft through which the assignment is expressed.

> You cannot steward a purpose you will not define.

Watch the presentation once without notes. Then watch it again with a notebook and answer the three questions in the practice prompt.`,
            practicePrompt:
              "Write your current definition of purpose in one sentence. Keep it — you will compare it with the end-of-course version.",
          },
          {
            title: "Listen: the difference between purpose and ambition",
            kind: "audio",
            summary: "A short audio reflection to listen to on a walk.",
            audioUrl: AUDIO,
            imageUrl: IMG.journal,
            imageAlt: "Open journal and coffee on a table",
            durationMinutes: 9,
            body: `Ambition asks *how high can I go?* Purpose asks *who am I sent to serve?*

Both can produce activity. Only one produces peace.

:::callout Listen with one question in mind: where have I been calling ambition, purpose?

Write down the first honest answer, not the most spiritual one.`,
            practicePrompt: "Name one ambition you have been calling purpose, and the person it was supposed to serve.",
          },
          {
            title: "Read: the five principles and their questions",
            kind: "reading",
            summary: "The organising framework for all fifteen sessions.",
            imageUrl: IMG.roundTable,
            imageAlt: "Round-table discussion in progress",
            durationMinutes: 11,
            body: `## Five questions that organise a life

1. **Identity — Who am I?** The person, before the role.
2. **Source — Where am I from?** The inheritance you receive or must grieve.
3. **Purpose — Why am I here?** The assignment you can articulate.
4. **Potential — What can I do?** The capacity entrusted for service.
5. **Destiny — Where am I going?** The vision that orders your calendar.

Every session in the programme sits under one of these questions. When you feel lost, you are usually missing an answer to one of them.

## How to use this framework

Before each session, name which question the session is answering. After the session, write one sentence you could defend in a kitchen-table conversation.`,
            downloadUrl: "/api/resources/five-principles-overview/download",
            downloadLabel: "Download the five principles overview",
            practicePrompt: "Which of the five questions is weakest in your life right now? Say why in two sentences.",
          },
        ],
      },
      {
        title: "Becoming a person of value",
        summary: "Character before platform — the interior life that carries an assignment.",
        sessionCode: "PURP 102",
        estimatedMinutes: 38,
        lessons: [
          {
            title: "Watch: value is built in private",
            kind: "video",
            summary: "Three habits that make a person valuable to the people they serve.",
            videoUrl: VIDEO,
            imageUrl: IMG.mentorship,
            imageAlt: "One-to-one mentoring conversation",
            durationMinutes: 16,
            body: `## The unglamorous test

Ask three people who live with you: *what am I like when I am tired?* Their answer is closer to your character than any résumé.

- Tired-you still keeps promises.
- Tired-you does not punish people with withdrawal.
- Tired-you can receive feedback without rehearsing a defence.

> A public assignment eventually rests on a private foundation.

If the answer troubles you, that is a reason to start earlier, not a reason to be ashamed.`,
            practicePrompt: "Ask one person the tired question. Write their answer word for word before you respond to it.",
          },
          {
            title: "Illustration: the household of value",
            kind: "illustration",
            summary: "A visual map of the four rooms that form character.",
            imageUrl: IMG.listening,
            imageAlt: "People listening attentively in a session",
            durationMinutes: 6,
            body: `The illustration names four rooms every purposeful life needs:

1. **The room of prayer** — where identity is received, not performed.
2. **The room of repair** — where apologies are made quickly.
3. **The room of rest** — where limits are accepted as design.
4. **The room of telling** — where truth is spoken to one trusted person.

Most of us furnish one room and neglect the other three. Notice which one you avoid.`,
            practicePrompt: "Choose the neglected room and one small weekly practice that furnishes it.",
          },
          {
            title: "Worksheet: the person-of-value audit",
            kind: "download",
            summary: "A one-page audit with the practice you will keep for thirty days.",
            imageUrl: IMG.study,
            imageAlt: "Notebook and pen ready for an audit",
            durationMinutes: 12,
            body: `Print the audit and complete it by hand. Handwriting slows you enough to be honest.

Score each of the four rooms from one to five, then choose one practice you will keep for thirty days before you tell anyone about it.

:::callout A discipline you announce immediately is usually a discipline you abandon quietly.`,
            downloadUrl: "/api/resources/gifting-audit-worksheet/download",
            downloadLabel: "Download the audit worksheet",
            practicePrompt: "Keep the practice for thirty days. Write the start date here.",
          },
        ],
      },
      {
        title: "Purpose and work",
        summary: "What to do on Monday when assignment and ambition disagree.",
        sessionCode: "PURP 103",
        estimatedMinutes: 44,
        lessons: [
          {
            title: "Watch: your job is a workshop, not a verdict",
            kind: "video",
            summary: "How to serve purpose inside an unrelated role.",
            videoUrl: VIDEO,
            imageUrl: IMG.workshop,
            imageAlt: "Participants working through a case study",
            durationMinutes: 18,
            body: `Work is not a detour from purpose; it is a workshop for it.

## Three questions for Monday

1. What is this position uniquely able to teach me?
2. Who is in front of me that I am sent to serve right now?
3. What would a purposeful version of this same job look like in ninety days?

> Do not leave only to be free of something. Leave toward a named burden.

We will use these questions again in the live class at the end of this module.`,
            practicePrompt: "Answer the third question in one paragraph. Bring it to the live class.",
          },
          {
            title: "Read: the false choice between calling and career",
            kind: "reading",
            summary: "A short essay on position, vocation and assignment.",
            imageUrl: IMG.roundTable,
            imageAlt: "Professionals in discussion",
            durationMinutes: 10,
            body: `Most people asking *should I leave my job to follow my purpose?* are asking the question in the wrong order.

Separate **assignment** (enduring), **vocation** (the craft), and **position** (the current seat). The false choice appears when someone treats a position as an assignment. Positions end. Assignments do not fail because a seat changed.

## Practical test

If your position ended tomorrow, what would still be true about what you are sent to do? Write that down. It is closer to your assignment than any title.`,
            downloadUrl: "/api/resources/purpose-and-career-guide/download",
            downloadLabel: "Download the career field guide",
            practicePrompt: "Write the sentence you would still believe if your current role ended tomorrow.",
          },
          {
            title: "Practice: the ninety-day purposeful-job plan",
            kind: "practice",
            summary: "Turn the teaching into three commitments for the next quarter.",
            imageUrl: IMG.journal,
            imageAlt: "Journal open at a planning page",
            durationMinutes: 15,
            body: `Design the next ninety days inside your current role.

1. **One person to serve deliberately.** Name them.
2. **One skill to develop.** Name the evidence you will be able to show.
3. **One thing to stop.** Subtraction is the most under-used planning tool.

Submit the plan as an assignment so your mentor can respond to it.`,
            practicePrompt: "Write your three commitments, then post them in the module discussion for accountability.",
          },
        ],
      },
    ],
  },
  {
    level: "intermediate",
    slug: "purpose-discovery-clarity",
    title: "Purpose Discovery and Clarity",
    subtitle: "From vague calling to a statement you can defend",
    summary:
      "Guided discovery, gifting evidence and story work, ending with a purpose statement reviewed by your clarity coach.",
    description:
      "The Intermediate level in structured form. You will gather evidence about your design, name your dominant gifts, write and test a purpose statement, and shape a transformation story you can tell in any room. Coaching sessions run alongside the modules.",
    cover: IMG.intermediate,
    accent: "green",
    hours: 6,
    status: "published",
    isSequential: true,
    modules: [
      {
        title: "Discovering Your Purpose",
        summary: "A structured discovery workshop using story, gifting, burden and opportunity.",
        sessionCode: "PURP 201",
        estimatedMinutes: 48,
        isPreview: true,
        lessons: [
          {
            title: "Watch: the four sources of evidence",
            kind: "video",
            summary: "Story, gifting, burden and opportunity — and how to test each one.",
            videoUrl: VIDEO,
            imageUrl: IMG.workshop,
            imageAlt: "Workshop setting with participants at tables",
            durationMinutes: 17,
            isPreview: true,
            body: `Discovery is not intuition; it is evidence gathering.

## Four sources

1. **Story** — the pattern of what broke and what bloomed.
2. **Gifting** — capacity that others notice before you do.
3. **Burden** — the need you cannot stop noticing.
4. **Opportunity** — the doors that keep opening without manipulation.

A purpose statement that only uses one source is usually a preference dressed as revelation.

> Test every claim about your purpose against at least two sources of evidence.`,
            practicePrompt: "List one piece of evidence from each of the four sources. No adjectives without evidence.",
          },
          {
            title: "Audio: a guided discovery walk",
            kind: "audio",
            summary: "Twenty minutes of questions to answer out loud while walking.",
            audioUrl: AUDIO,
            imageUrl: IMG.garden,
            imageAlt: "Outdoor garden setting for reflection",
            durationMinutes: 20,
            body: `Take this audio outside. Answer out loud — the voice carries honesty that a page sometimes does not.

The walk covers four movements: origin, wound, gift, invitation.

:::callout If a question embarrasses you, that is usually where the work is. Pause and answer it anyway.`,
            practicePrompt: "Note the question that embarrassed you most, and what you answered.",
          },
          {
            title: "Worksheet: raw material for your statement",
            kind: "download",
            summary: "The discovery canvas you will bring to your clarity session.",
            durationMinutes: 12,
            imageUrl: IMG.journal,
            imageAlt: "Journal with worksheet",
            body: `Complete the canvas: one audience, one transformation, one evidence, one limit.

Do not write the final statement yet. Bring the raw material to your clarity session with Coach Miriam, where we will draft and test it together.`,
            downloadUrl: "/api/resources/gifting-audit-worksheet/download",
            downloadLabel: "Download the discovery canvas",
            practicePrompt: "Book your clarity session after completing the canvas.",
          },
        ],
      },
      {
        title: "Limits and liberating potential",
        summary: "Naming the ceilings that keep capacity imprisoned.",
        sessionCode: "PURP 202",
        estimatedMinutes: 40,
        lessons: [
          {
            title: "Watch: what is capping your capacity?",
            kind: "video",
            summary: "Fear, comparison, unhealed history and poor stewardship.",
            videoUrl: VIDEO,
            imageUrl: IMG.listening,
            imageAlt: "Attentive listeners in a training room",
            durationMinutes: 15,
            body: `Potential is a stewardship, not a personality trait. It has a shape and a limit.

## Four ceilings

- **Fear** — capacity avoided rather than absent.
- **Comparison** — attention taxed by someone else's assignment.
- **Unhealed history** — energy spent managing an old story.
- **Poor stewardship** — gifts used without rhythm or accountability.

> You are not responsible for universal potential. You are responsible for the portion in your hands.`,
            practicePrompt: "Name your ceiling and one accountability structure you will put around it this month.",
          },
          {
            title: "Read: the gifting audit",
            kind: "reading",
            summary: "How to evidence a gift without exaggerating it.",
            durationMinutes: 9,
            imageUrl: IMG.study,
            imageAlt: "Study notes and books",
            body: `A gift is capacity that others notice and that produces fruit across different rooms.

## Evidence rules

1. Ask for specific examples, not compliments.
2. Anything without evidence moves to the *unknown* column.
3. Look for repetition across contexts: work, family, church, friendship.

The *unknown* column is the most honest part of the audit page.`,
            downloadUrl: "/api/resources/gifting-audit-worksheet/download",
            downloadLabel: "Download the gifting audit",
            practicePrompt: "Complete one column of evidence per day this week.",
          },
          {
            title: "Practice: the release plan",
            kind: "practice",
            summary: "Three moves that free confined capacity.",
            durationMinutes: 14,
            imageUrl: IMG.mentorship,
            imageAlt: "Coaching conversation",
            body: `Write three moves for the next thirty days:

1. **A conversation** you have been avoiding.
2. **A boundary** that protects your best hours.
3. **A request** for the opportunity your gifts require.

Share it with your accountability partner before you begin.`,
            practicePrompt: "Send the request this week. Record what happened, not what you feared.",
          },
        ],
      },
      {
        title: "Defining Your Purpose Statement",
        summary: "Draft, test and refine a statement you can defend.",
        sessionCode: "PURP 204",
        estimatedMinutes: 40,
        lessons: [
          {
            title: "Watch: the anatomy of a purpose statement",
            kind: "video",
            summary: "Audience, transformation, evidence, limit — in one sentence.",
            videoUrl: VIDEO,
            imageUrl: IMG.workshop,
            imageAlt: "Facilitator writing a framework",
            durationMinutes: 14,
            body: `A defensible statement contains four parts:

- **Audience** — who you are sent to serve.
- **Transformation** — what changes for them.
- **Evidence** — why you can credibly carry it.
- **Limit** — what you are not sent to do.

> Clarity is a form of honesty. A statement that cannot be tested is not yet a statement.`,
            practicePrompt: "Write two drafts. Do not edit while writing.",
          },
          {
            title: "Read: testing your statement with four questions",
            kind: "reading",
            summary: "A peer test you can run in fifteen minutes.",
            durationMinutes: 8,
            body: `Run this with one peer and one mentor:

1. Is the audience specific enough to picture?
2. Is the transformation observable?
3. Is the evidence real or aspirational?
4. Does the limit make you uncomfortable? It should.

Record the feedback verbatim and revise once — not five times.`,
            practicePrompt: "Run the test with two people and record their exact words.",
          },
          {
            title: "Submit: your purpose statement",
            kind: "practice",
            summary: "Final submission for mentor review.",
            durationMinutes: 12,
            imageUrl: IMG.journal,
            imageAlt: "Final statement written in a journal",
            body: `Submit the statement with the evidence behind each part.

Your mentor will respond with one strength, one gap, and one next action. Bring the final version to the live clarity lab.`,
            practicePrompt: "Submit your statement in the assignments tab before the coaching session.",
          },
        ],
      },
    ],
  },
  {
    level: "advanced",
    slug: "vision-deployment-impact",
    title: "Vision, Deployment and Impact",
    subtitle: "Build the structure your assignment requires",
    summary:
      "Vision building, positioning, stewardship of time and relationships, ending with a 90-day deployment plan.",
    description:
      "The Advanced level in structured form: from picture to plan to public presentation. Includes the capstone panel and a live group-work studio.",
    cover: IMG.summit,
    accent: "purple",
    hours: 7,
    status: "published",
    isSequential: true,
    modules: [
      {
        title: "Understanding vision",
        summary: "Vision as a disciplined act of imagination under God.",
        sessionCode: "PURP 301",
        estimatedMinutes: 46,
        lessons: [
          {
            title: "Watch: vision is built twice",
            kind: "video",
            summary: "First in secret, then in public — with a budget.",
            videoUrl: VIDEO,
            imageUrl: IMG.summit,
            imageAlt: "Hiker on a summit at sunrise",
            durationMinutes: 19,
            body: `A vision that cannot survive a budget meeting is atmosphere, not vision.

## Anatomy

1. **Burden** — a need you cannot stop noticing.
2. **Picture** — a describable future, not a slogan.
3. **Pathway** — the first three steps with names and dates.
4. **Cost** — what it requires from you and from others.

> Write your vision as a normal Tuesday five years from now. If you cannot picture a Tuesday, you have a slogan.`,
            practicePrompt: "Write the Tuesday. One page.",
          },
          {
            title: "Illustration: the vision-to-plan canvas",
            kind: "illustration",
            summary: "How a picture becomes milestones, people and prices.",
            imageUrl: IMG.study,
            imageAlt: "Planning canvas on a desk",
            durationMinutes: 7,
            body: `The canvas has four quadrants: picture, pathway, people, price.

Every milestone needs a name and a number. Every partnership needs an honest conversation.`,
            downloadUrl: "/api/resources/vision-plan-12-months/download",
            downloadLabel: "Download the twelve-month vision plan",
            practicePrompt: "Fill all four quadrants before the next live studio.",
          },
          {
            title: "Audio: the cost conversation",
            kind: "audio",
            summary: "A reflection on naming the cost out loud.",
            audioUrl: AUDIO,
            durationMinutes: 12,
            imageUrl: IMG.journal,
            imageAlt: "Journal and coffee",
            body: `Naming the cost out loud protects you from resenting the vision later.

Speak it to one person who loves you enough to disagree with you.`,
            practicePrompt: "Have the cost conversation and record what changed in the plan.",
          },
        ],
      },
      {
        title: "Positioning for emergence",
        summary: "Readiness, visibility and stewardship of your message.",
        sessionCode: "PURP 303",
        estimatedMinutes: 40,
        lessons: [
          {
            title: "Watch: positioning is stewardship, not self-promotion",
            kind: "video",
            summary: "Evidence of work, rooms worth entering, and character to stay.",
            videoUrl: VIDEO,
            imageUrl: IMG.roundTable,
            imageAlt: "Professionals at a round table",
            durationMinutes: 16,
            body: `Positioning answers a simple question: *if the room you need opened tomorrow, what evidence would you bring?*

## Three assets

- **Evidence** — documented fruit of your work.
- **Language** — the two sentences people repeat about you.
- **Posture** — the character that keeps you in the room.

> Can your character carry your gift? Not yet? Then build the character first.`,
            practicePrompt: "Assemble one page of evidence and send it to your mentor.",
          },
          {
            title: "Read: personal brand with a limit",
            kind: "reading",
            summary: "How to be known without being consumed.",
            durationMinutes: 10,
            body: `A personal brand is not a performance; it is a set of promises you keep in public.

Write three promises you can keep for a year. Then refuse every opportunity that requires you to break them.`,
            practicePrompt: "Write your three promises. One sentence each.",
          },
          {
            title: "Practice: the table you are building",
            kind: "practice",
            summary: "Mentor, peer, builder, truth-teller.",
            durationMinutes: 13,
            imageUrl: IMG.mentorship,
            imageAlt: "Mentor and student in conversation",
            body: `Identify the four seats around your table and who currently occupies them.

For each empty seat, name the one person you will invite this month — and what you will bring to the conversation.`,
            practicePrompt: "Send one invitation before the week ends.",
          },
        ],
      },
    ],
  },
];

export async function seedAcademyContent() {
  const levelRows = await db.select().from(courseLevels);
  const levelBySlug = new Map(levelRows.map((level) => [level.slug, level]));
  const profileRows = await db
    .select({ id: profiles.id, slug: profiles.slug, roleSlug: roles.slug })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id));
  const mentor = profileRows.find((profile) => profile.roleSlug === "mentor") ?? profileRows[0];
  const student = profileRows.find((profile) => profile.roleSlug === "student") ?? profileRows[0];
  const admin = profileRows.find((profile) => profile.roleSlug === "admin") ?? profileRows[0];

  const createdCourses: { id: number; slug: string; levelId: number }[] = [];

  for (const [index, seed] of COURSES.entries()) {
    const level = levelBySlug.get(seed.level);
    if (!level) continue;

    const inserted = await db
      .insert(courses)
      .values({
        levelId: level.id,
        slug: seed.slug,
        title: seed.title,
        subtitle: seed.subtitle,
        summary: seed.summary,
        description: seed.description,
        coverImageUrl: seed.cover,
        accent: seed.accent,
        estimatedHours: seed.hours,
        status: seed.status,
        isSequential: seed.isSequential,
        sortOrder: index + 1,
      })
      .returning({ id: courses.id });

    for (const [moduleIndex, moduleSeed] of seed.modules.entries()) {
      const moduleRow = await db
        .insert(courseModules)
        .values({
          courseId: inserted[0].id,
          slug: `module-${moduleIndex + 1}`,
          title: moduleSeed.title,
          summary: moduleSeed.summary,
          sessionCode: moduleSeed.sessionCode ?? null,
          estimatedMinutes: moduleSeed.estimatedMinutes,
          isPreview: moduleSeed.isPreview ?? false,
          sortOrder: moduleIndex + 1,
        })
        .returning({ id: courseModules.id });

      for (const [lessonIndex, lessonSeed] of moduleSeed.lessons.entries()) {
        await db.insert(lessons).values({
          moduleId: moduleRow[0].id,
          slug: `lesson-${lessonIndex + 1}`,
          title: lessonSeed.title,
          kind: lessonSeed.kind,
          summary: lessonSeed.summary,
          body: lessonSeed.body,
          videoUrl: lessonSeed.videoUrl ?? null,
          audioUrl: lessonSeed.audioUrl ?? null,
          imageUrl: lessonSeed.imageUrl ?? null,
          imageAlt: lessonSeed.imageAlt ?? null,
          downloadUrl: lessonSeed.downloadUrl ?? null,
          downloadLabel: lessonSeed.downloadLabel ?? null,
          practicePrompt: lessonSeed.practicePrompt ?? null,
          durationMinutes: lessonSeed.durationMinutes ?? 12,
          isPreview: lessonSeed.isPreview ?? false,
          status: "published",
          sortOrder: lessonIndex + 1,
        });
      }
    }

    createdCourses.push({ id: inserted[0].id, slug: seed.slug, levelId: level.id });
  }

  // Student progress: first course's opening lesson complete, second in progress.
  const firstCourse = createdCourses[0];
  if (firstCourse && student) {
    const moduleRows = await db.select().from(courseModules).where(eq(courseModules.courseId, firstCourse.id));
    const firstModule = moduleRows.sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (firstModule) {
      const lessonRows = await db.select().from(lessons).where(eq(lessons.moduleId, firstModule.id));
      const sorted = lessonRows.sort((a, b) => a.sortOrder - b.sortOrder);
      if (sorted[0]) {
        await db.insert(lessonProgress).values({
          profileId: student.id,
          lessonId: sorted[0].id,
          status: "completed",
          completedAt: daysAgo(6),
        }).onConflictDoNothing();
      }
      if (sorted[1]) {
        await db.insert(lessonProgress).values({
          profileId: student.id,
          lessonId: sorted[1].id,
          status: "in_progress",
          secondsWatched: 240,
          note: "Listening to this again on the commute.",
        }).onConflictDoNothing();
      }
    }
  }

  const intermediateCourse = createdCourses.find((course) => course.slug === "purpose-discovery-clarity") ?? firstCourse;

  const liveRows = await db
    .insert(liveSessions)
    .values([
      {
        courseId: intermediateCourse?.id ?? null,
        hostId: mentor?.id ?? null,
        title: "Clarity lab — purpose statements under review",
        description:
          "Bring both drafts of your purpose statement and the evidence you gathered. We will test statements in groups of three and rewrite once, together.",
        type: "class",
        status: "scheduled",
        startsAt: daysAhead(3, 15),
        durationMinutes: 90,
        meetingUrl: "https://meet.google.com/purpose-clarity-lab",
        agenda:
          "1. Teaching: the four-part test (15 min)\n2. Groups of three: read, test, note (30 min)\n3. Rewrite in silence (15 min)\n4. Two live reviews + close (30 min)",
      },
      {
        courseId: intermediateCourse?.id ?? null,
        hostId: mentor?.id ?? null,
        title: "Group work studio — gifting evidence panels",
        description:
          "Small groups examine each member's gifting evidence and name what they see. Come ready to read your audit aloud.",
        type: "group_work",
        status: "scheduled",
        startsAt: daysAhead(6, 11),
        durationMinutes: 75,
        meetingUrl: "https://meet.google.com/purpose-group-studio",
        groupSize: 4,
        agenda:
          "Groups of four. Each person: 5 minutes to present evidence, 6 minutes of questions, 2 minutes of written encouragement.",
      },
      {
        courseId: createdCourses[0]?.id ?? null,
        hostId: admin?.id ?? null,
        title: "Round table — is my job my purpose?",
        description:
          "An open conversation on work, calling and Monday morning. Bring one honest question, not a position.",
        type: "discussion",
        status: "live",
        startsAt: daysAgo(0, 8),
        durationMinutes: 60,
        meetingUrl: "https://meet.google.com/purpose-round-table",
        agenda: "Three questions from the room, then open table. Daniel hosts; Grace moderates the feed.",
      },
      {
        hostId: mentor?.id ?? null,
        title: "Office hours — bring one decision",
        description: "Fifteen-minute slots for a decision you are stuck on. Post your question in the feed to claim a slot.",
        type: "office_hours",
        status: "scheduled",
        startsAt: daysAhead(9, 16),
        durationMinutes: 60,
        meetingUrl: "https://meet.google.com/purpose-office-hours",
      },
      {
        courseId: createdCourses[0]?.id ?? null,
        hostId: mentor?.id ?? null,
        title: "Foundation clinic — definitions and questions",
        description: "A recorded clinic covering the most common questions from the Foundation level.",
        type: "class",
        status: "ended",
        startsAt: daysAgo(14, 15),
        durationMinutes: 75,
        recordingUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      },
    ])
    .returning({ id: liveSessions.id, title: liveSessions.title });

  const liveRoom = liveRows.find((row) => row.title.startsWith("Round table"));
  if (liveRoom && student && mentor && admin) {
    await db.insert(liveRsvps).values([
      { liveSessionId: liveRoom.id, profileId: student.id, status: "going" },
      { liveSessionId: liveRoom.id, profileId: mentor.id, status: "going" },
    ]);

    await db.insert(liveMessages).values([
      {
        liveSessionId: liveRoom.id,
        authorId: admin.id,
        authorName: "Alex Ssenyondo",
        authorRole: "host",
        kind: "system",
        body: "Alex Ssenyondo opened the room. Post your questions in the feed.",
        createdAt: daysAgo(0, 8),
      },
      {
        liveSessionId: liveRoom.id,
        authorId: admin.id,
        authorName: "Alex Ssenyondo",
        authorRole: "host",
        kind: "prompt",
        body: "Question one: what would change at work tomorrow if you believed your job was a workshop rather than a verdict?",
        createdAt: daysAgo(0, 8),
      },
      {
        liveSessionId: liveRoom.id,
        authorId: student.id,
        authorName: "Joan Kirabo",
        authorRole: "student",
        kind: "chat",
        body: "I would stop measuring my value in response times. I have been treating a fast inbox as evidence that I matter.",
        createdAt: daysAgo(0, 8),
      },
      {
        liveSessionId: liveRoom.id,
        authorId: student.id,
        authorName: "Joan Kirabo",
        authorRole: "student",
        kind: "question",
        body: "How do you tell the difference between a hard season and the wrong seat?",
        createdAt: daysAgo(0, 9),
      },
      {
        liveSessionId: liveRoom.id,
        authorId: mentor.id,
        authorName: "Miriam Kaggwa",
        authorRole: "mentor",
        kind: "chat",
        body: "A hard season still produces fruit somewhere. The wrong seat produces only relief when you imagine leaving. Ask which one you are in.",
        createdAt: daysAgo(0, 9),
      },
    ]);
  }

  return { courses: createdCourses.length, liveSessions: liveRows.length };
}
