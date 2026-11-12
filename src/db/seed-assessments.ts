import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  assessmentAnswers,
  assessmentAttempts,
  assessmentQuestions,
  assessments,
  courseGroups,
  courseLevels,
  courseModules,
  courses,
  groupMembers,
  groupSubmissions,
  lessonProgress,
  lessons,
  profiles,
  roles,
} from "./schema";
import { synchronizeCertificates } from "./certificate-awards";

type Q = [string, string[], number, string];

const SESSION_QUIZZES: Record<string, Q[]> = {
  "What purpose actually is": [
    ["In PURP 101, purpose is best described as…", ["The career you eventually choose", "The enduring reason you are here, independent of roles", "A feeling of fulfilment you pursue", "The platform you build for influence"], 1, "Purpose is the enduring reason you are here; assignment and vocation change with seasons."],
    ["Which distinction does the lesson draw?", ["Purpose equals assignment", "Assignment is the specific work purpose requires in a season", "Vocation is identical to purpose", "Purpose changes whenever a job changes"], 1, "Purpose endures; assignment is season-specific; vocation is the craft or field."],
    ["Why does the course insist on definition before discovery?", ["Definitions are required by law", "A statement you cannot define cannot be stewarded", "Definitions impress facilitators", "Definition replaces the need for prayer"], 1, "Definition makes stewardship possible."],
    ["The five principles are organised by which first question?", ["What can I do?", "Who am I?", "Where am I going?", "Why am I here?"], 1, "Identity comes first: who am I?"],
    ["Which is NOT one of the five purpose principles?", ["Source", "Potential", "Productivity", "Destiny"], 2, "The five are Identity, Source, Purpose, Potential and Destiny."],
  ],
  "Becoming a person of value": [
    ["The 'unglamorous test' of character asks…", ["What am I like when I am tired?", "How many people follow me?", "What have I achieved this year?", "How well do I speak in public?"], 0, "Character shows in how you treat people when depleted."],
    ["Which is one of the four 'rooms' of value?", ["The room of applause", "The room of repair", "The room of comparison", "The room of secrecy"], 1, "The four rooms are prayer, repair, rest and telling."],
    ["Why is a private foundation necessary?", ["A public assignment eventually rests on it", "It guarantees promotion", "It removes all criticism", "It replaces accountability"], 0, "Platforms collapse when the foundation is missing."],
    ["A discipline you announce immediately is often…", ["More effective", "Abandoned quietly", "A biblical requirement", "A sign of maturity"], 1, "Announcing early usually substitutes for doing the work."],
    ["The audit in PURP 102 asks you to choose…", ["Five new gifts", "One practice kept for thirty days", "A new job", "Three mentors"], 1, "One practice, thirty days, before telling anyone."],
  ],
  "Purpose and work": [
    ["The lesson argues your job is…", ["A verdict on your worth", "A workshop for purpose", "Irrelevant to calling", "The same thing as assignment"], 1, "Work is a workshop, not a verdict."],
    ["Which three items should be distinguished?", ["Salary, title, benefits", "Assignment, vocation, position", "Purpose, hobby, ambition", "Manager, team, client"], 1, "Assignment, vocation and position are different categories."],
    ["The false choice appears when someone…", ["Changes jobs", "Treats a position as the assignment", "Takes a sabbatical", "Builds a career"], 1, "Positions end; assignments do not fail because a seat changed."],
    ["What is the most under-used planning tool named in the lesson?", ["Addition", "Subtraction", "Delegation", "Automation"], 1, "Subtraction: one thing to stop."],
    ["The ninety-day plan asks for one person to serve, one skill to develop, and…", ["One conference to attend", "One thing to stop", "One title to pursue", "One competitor to study"], 1, "Service, skill, and subtraction."],
  ],
  "Discovering Your Purpose": [
    ["Which is NOT one of the four sources of evidence?", ["Story", "Gifting", "Popularity", "Burden"], 2, "The four are story, gifting, burden and opportunity."],
    ["A purpose statement built on one source is usually…", ["Sufficient", "A preference dressed as revelation", "Stronger than a tested one", "Not worth writing"], 1, "Test claims against at least two sources."],
    ["Gifting is best evidenced by…", ["Compliments", "Specific examples across different rooms", "Self-assessment alone", "Title and seniority"], 1, "Ask for examples, not adjectives."],
    ["What belongs in the 'unknown' column of the audit?", ["Gifts you desire", "Claims without evidence", "Compliments you liked", "Your job title"], 1, "Anything without evidence stays unknown until tested."],
    ["The discovery walk covers origin, wound, gift and…", ["Reward", "Invitation", "Income", "Platform"], 1, "Origin, wound, gift, invitation."],
  ],
  "Limits and liberating potential": [
    ["Which is a ceiling on capacity named in the lesson?", ["Comparison", "Coaching", "Rest", "Feedback"], 0, "Fear, comparison, unhealed history and poor stewardship are the ceilings."],
    ["Potential is described as…", ["Infinite and unconditional", "A stewardship with a shape and limit", "A personality trait", "A measure of intelligence"], 1, "Potential is capacity entrusted for service."],
    ["The lesson says you are responsible for…", ["Universal potential", "The portion in your hands", "Everyone else's growth", "Constant output"], 1, "Responsibility is limited to the entrusted portion."],
    ["The release plan includes a conversation, a boundary and…", ["A promotion", "A request", "A resignation", "A rebrand"], 1, "Ask for the opportunity your gifts require."],
    ["A boundary's purpose in the plan is to…", ["Protect your best hours", "Avoid people", "Increase output", "Signal status"], 0, "Boundaries protect capacity rather than avoid relationship."],
  ],
  "Defining Your Purpose Statement": [
    ["Which is NOT one of the four parts of a statement?", ["Audience", "Transformation", "Evidence", "Revenue"], 3, "Audience, transformation, evidence and limit."],
    ["The limit in a purpose statement shows…", ["What you are not sent to do", "Your salary ceiling", "How many followers you want", "The size of your team"], 0, "A truthful limit clarifies the assignment."],
    ["A statement that cannot be tested is…", ["Ready to publish", "Not yet a statement", "Ideal for a brand", "Better than a specific one"], 1, "Testability is part of clarity."],
    ["How many times should you revise after peer feedback?", ["Once", "Five times", "Never", "Until perfect"], 0, "Revise once, not five times."],
    ["Testing the statement should involve…", ["One peer and one mentor", "Only yourself", "Social media polls", "A focus group of strangers"], 0, "One peer and one mentor is the guidance."],
  ],
  "Understanding vision": [
    ["Which is NOT part of the anatomy of vision?", ["Burden", "Picture", "Pathway", "Publicity"], 3, "Burden, picture, pathway and cost."],
    ["Vision is built twice: first in secret then…", ["In public", "In isolation", "In silence", "Abroad"], 0, "Secret formation, public testing."],
    ["The test of whether you have a vision or a slogan is…", ["Can you picture a normal Tuesday?", "Is it trending?", "Does it rhyme?", "Did a leader endorse it?"], 0, "If you cannot picture a Tuesday, it is a slogan."],
    ["Every milestone in the plan needs…", ["A person and a price", "A hashtag", "A sponsor", "A deadline only"], 0, "Milestones need people and cost."],
    ["The cost conversation is meant to be had with…", ["Anyone online", "One person who loves you enough to disagree", "Only your mentor", "No one"], 1, "Speak the cost to someone who can disagree."],
  ],
  "Positioning for emergence": [
    ["Positioning answers which question?", ["Who is watching me?", "If the room opened tomorrow, what evidence would I bring?", "How do I become famous?", "Who can promote me?"], 1, "It is about prepared evidence, not promotion."],
    ["Which three assets does the lesson name?", ["Evidence, language, posture", "Money, contacts, luck", "Talent, timing, title", "Followers, likes, shares"], 0, "Evidence, language and posture."],
    ["A personal brand is described as…", ["A performance", "Promises you keep in public", "A logo", "A follower count"], 1, "Brand is kept promises, not performance."],
    ["Before seeking the room, you should ask…", ["Can my character carry my gift?", "Is my résumé long enough?", "Do I have a photographer?", "Will people clap?"], 0, "Character must be able to carry the gift."],
    ["The practice asks you to fill which four seats?", ["Mentor, peer, builder, truth-teller", "Boss, client, friend, critic", "Teacher, coach, sponsor, fan", "Pastor, parent, partner, producer"], 0, "Mentor, peer, builder and truth-teller."],
  ],
};

const LEVEL_EXAMS: Record<string, [string, string[], number][]> = {
  foundation: [
    ["A defensible definition of purpose must be…", ["Based on ambition", "Independent of your current role", "Confirmed by salary", "Approved by peers"], 1],
    ["Identity precedes assignment because…", ["Roles are unspiritual", "You cannot build a stable life on a borrowed definition", "Identity guarantees success", "Assignment is optional"], 1],
    ["Which principle answers 'Where am I from?'", ["Potential", "Source", "Destiny", "Purpose"], 1],
    ["Becoming a person of value is primarily about…", ["Visibility", "Interior formation", "Networking", "Output"], 1],
    ["The four rooms of character are prayer, repair, rest and…", ["Revenue", "Telling", "Platform", "Study"], 1],
    ["Work is best described in the course as…", ["A verdict", "A workshop for purpose", "A distraction", "The assignment itself"], 1],
    ["The false choice of purpose or career collapses when you…", ["Quit your job", "Treat position as assignment", "Separate assignment, vocation and position", "Start a business"], 2],
    ["Predestination discussions in PURP 104 hold together…", ["Sovereignty and agency", "Ambition and luck", "Skill and income", "Faith and fashion"], 0],
    ["Testing an inward call should involve…", ["Immediate resignation", "Community, Scripture and fruit", "Social media approval", "Financial gain"], 1],
    ["The most under-used planning tool named in the course is…", ["Addition", "Subtraction", "Delegation", "Automation"], 1],
    ["The five purpose principles begin with…", ["Destiny", "Identity", "Purpose", "Potential"], 1],
    ["'Source' as an inheritance may require…", ["Receiving with gratitude only", "Receiving or grieving honestly", "Ignoring the past", "Repeating every pattern"], 1],
    ["An evidence-based gifting audit rejects…", ["Specific examples", "Adjectives without evidence", "Peer reports", "Repeated patterns"], 1],
    ["Purpose discovery uses story, gifting, burden and…", ["Income", "Opportunity", "Popularity", "Title"], 1],
    ["A useful purpose statement includes audience, transformation, evidence and…", ["Revenue", "Limit", "Follower count", "Hashtag"], 1],
    ["A hard season differs from the wrong seat because a hard season…", ["Feels easy", "Produces fruit somewhere", "Requires resignation", "Guarantees promotion"], 1],
    ["Character matters because a public assignment eventually rests on it — this belongs to which principle?", ["Destiny", "Identity", "Potential", "Source"], 1],
    ["Which is NOT one of the course's five principles?", ["Source", "Purpose", "Potential", "Prosperity"], 3],
    ["Clarity is described as…", ["A personality trait", "A discipline", "A mood", "A birthright"], 1],
    ["The Foundation level's aim is to help you…", ["Launch a ministry immediately", "Understand purpose before pursuing it", "Build a following", "Write a business plan"], 1],
  ],
  intermediate: [
    ["The four sources of discovery evidence are story, gifting, burden and…", ["Income", "Opportunity", "Title", "Followers"], 1],
    ["A claim about purpose should be tested against…", ["One source", "At least two sources", "Your feelings only", "Popular opinion"], 1],
    ["Potential is best understood as…", ["Limitless", "A stewardship with shape", "A personality type", "A guaranteed outcome"], 1],
    ["Which is a named ceiling on capacity?", ["Feedback", "Comparison", "Coaching", "Rest"], 1],
    ["A gift is evidenced by…", ["Compliments", "Specific fruit across contexts", "Self-declaration", "A title"], 1],
    ["Gifting, skill and preference differ; the audit prioritises…", ["Preference", "Evidence", "Ambition", "Affirmation"], 1],
    ["The release plan's three moves are a conversation, a boundary and…", ["A request", "A resignation", "A rebrand", "A loan"], 0],
    ["The three questions for the legacy session include which?", ["How much will I earn?", "What must I stop doing now?", "Who should I impress?", "When will I be promoted?"], 1],
    ["A purpose statement's 'limit' answers…", ["What you are not sent to do", "How big your platform is", "Your salary band", "How many staff you need"], 0],
    ["Peer testing of a statement should produce…", ["Praise", "Verbatim feedback", "A score", "A press release"], 1],
    ["The transformation story should be honest enough that…", ["Another person can stand inside it", "It trends online", "It avoids pain", "It names only successes"], 0],
    ["Dominion language in PURP 205 is paired with…", ["Domination over others", "Tenderness and a truthful story", "Wealth creation", "Public speaking skill"], 1],
    ["Coaching sessions in the Intermediate level exist to…", ["Provide therapy", "Support clarity on statements and evidence", "Grade exams only", "Recruit leaders"], 1],
    ["Which voice should your purpose statement avoid?", ["Specific audience", "Aspirational vagueness", "Observable transformation", "Real evidence"], 1],
    ["Story lab helps you craft a story for…", ["A single interview only", "Interviews, pulpits, client rooms and family tables", "Social media only", "Academic journals"], 1],
    ["Naming gifts without exaggeration requires…", ["Marketing language", "Evidence and an 'unknown' column", "Peer flattery", "Certification"], 1],
    ["Clarity work should be repeated because…", ["Clarity is a practice, not a moment", "It impresses mentors", "It replaces prayer", "It ends effort"], 0],
    ["An accountability partner's role in the release plan is to…", ["Approve your goals", "Hold you to the plan and the request", "Score your work", "Publish your results"], 1],
    ["The intermediate pass requirement is a percentage that…", ["Is fixed at 50%", "Defaults to 80% and can vary by level", "Does not exist", "Is set by students"], 1],
    ["Auto-graded assessments exist to…", ["Replace mentorship", "Assess progressive understanding and prompt follow-up", "Rank students publicly", "Reduce teaching"], 1],
  ],
  advanced: [
    ["Vision is built twice: in secret and…", ["In public", "In isolation", "In silence", "Online"], 0],
    ["The anatomy of vision is burden, picture, pathway and…", ["Publicity", "Cost", "Profit", "Brand"], 1],
    ["A slogan is distinguishable from a vision because you cannot…", ["Picture a normal Tuesday", "Say it quickly", "Raise money for it", "Design a logo"], 0],
    ["Milestones need a named person and…", ["A price", "A hashtag", "A sponsor", "A platform"], 0],
    ["The cost conversation should be had with…", ["A large audience", "One person who can disagree", "Only yourself", "No one"], 1],
    ["Positioning is best described as…", ["Self-promotion", "Stewardship of your message", "Personal branding alone", "Networking tactics"], 1],
    ["Positioning requires evidence, language and…", ["Posture", "Capital", "Reach", "Titles"], 0],
    ["A personal brand is…", ["A set of promises kept in public", "A logo system", "A content calendar", "A follower number"], 0],
    ["Before entering a larger room, ask…", ["Can my character carry my gift?", "Will I be praised?", "Is my résumé longest?", "Who can introduce me?"], 0],
    ["The four seats around your table are mentor, peer, builder and…", ["Critic", "Truth-teller", "Investor", "Fan"], 1],
    ["Mentors primarily need from you…", ["Admiration", "An agenda", "A gift", "A following"], 1],
    ["Vision without cost becomes…", ["Strategy", "Fantasy", "Discipline", "Humility"], 1],
    ["Cost without picture becomes…", ["Drudgery", "Vision", "Freedom", "Rest"], 0],
    ["Family business succession is a classroom for which tension?", ["Inheritance and identity", "Profits and taxes", "Marketing and sales", "Hiring and firing"], 0],
    ["The twelve-month plan should include a stop-doing list because…", ["Subtraction protects capacity", "It impresses mentors", "It fills the page", "It avoids decisions"], 0],
    ["Which question belongs to stewardship of relationships in PURP 304?", ["Who holds my ladder?", "What is my salary?", "Which conference should I attend?", "How many followers do I have?"], 0],
    ["Capstone presentations exist to…", ["Entertain the cohort", "Test the plan with a panel and deploy in 90 days", "Replace assessments", "Award grades only"], 1],
    ["Advanced certificates are issued when…", ["A student registers", "Verification is complete and the pass mark is met", "Attendance reaches 50%", "A mentor requests it"], 1],
    ["Group work in the Advanced level is scored to…", ["Rank students publicly", "Inform coaching conversations", "Replace individual work", "Reduce teaching time"], 1],
    ["The purpose of auto-graded assessments is to…", ["Assess progressive understanding and trigger timely support", "Create competition", "Reduce faculty", "Replace reflection"], 0],
  ],
};

export async function seedAssessments() {
  const moduleRows = await db
    .select({
      id: courseModules.id,
      title: courseModules.title,
      courseId: courseModules.courseId,
      sortOrder: courseModules.sortOrder,
    })
    .from(courseModules);
  const courseRows = await db.select().from(courses);
  const levelRows = await db.select().from(courseLevels);

  // Level pass marks (varied by level to prove configurability)
  const passMarks: Record<string, number> = { foundation: 80, intermediate: 80, advanced: 85 };
  for (const level of levelRows) {
    await db.update(courseLevels).set({ passMark: passMarks[level.slug] ?? 80 }).where(eq(courseLevels.id, level.id));
  }

  // Session quizzes — 5 questions after every session
  for (const courseModule of moduleRows) {
    const course = courseRows.find((row) => row.id === courseModule.courseId);
    if (!course) continue;
    const questions = SESSION_QUIZZES[courseModule.title];
    if (!questions) continue;
    const [quiz] = await db
      .insert(assessments)
      .values({
        kind: "session",
        moduleId: courseModule.id,
        courseId: course.id,
        levelId: course.levelId,
        title: `${courseModule.title} — session check`,
        description: `Five auto-graded questions after ${course.title} · ${courseModule.title}.`,
        passMark: 80,
        timeLimitMinutes: 15,
        maxAttempts: 3,
        sortOrder: courseModule.sortOrder,
      })
      .returning({ id: assessments.id });

    await db.insert(assessmentQuestions).values(
      questions.map(([prompt, options, correctIndex, explanation], index) => ({
        assessmentId: quiz.id,
        prompt,
        options,
        correctIndex,
        explanation,
        sortOrder: index + 1,
      })),
    );
  }

  // Level exams — 20 questions after every level
  const levelExamIds: Record<string, number> = {};
  for (const level of levelRows) {
    const questions = LEVEL_EXAMS[level.slug];
    if (!questions) continue;
    const [exam] = await db
      .insert(assessments)
      .values({
        kind: "level",
        levelId: level.id,
        title: `${level.name} Level Examination`,
        description: `Twenty questions assessing progressive understanding across the ${level.name} level. Pass mark ${passMarks[level.slug] ?? 80}%.`,
        passMark: passMarks[level.slug] ?? 80,
        timeLimitMinutes: 45,
        maxAttempts: 3,
        sortOrder: level.sortOrder,
      })
      .returning({ id: assessments.id });
    levelExamIds[level.slug] = exam.id;

    await db.insert(assessmentQuestions).values(
      questions.map(([prompt, options, correctIndex], index) => ({
        assessmentId: exam.id,
        prompt,
        options,
        correctIndex,
        explanation: null,
        sortOrder: index + 1,
      })),
    );
  }

  // Seed a couple of historical attempts for the demo student
  const [student] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(roles.slug, "student"))
    .limit(1);
  const [mentor] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(roles.slug, "mentor"))
    .limit(1);
  const [admin] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(eq(roles.slug, "admin"))
    .limit(1);

  if (student) {
    const firstQuiz = await db
      .select({ id: assessments.id })
      .from(assessments)
      .where(eq(assessments.kind, "session"))
      .limit(2);
    const seededAttempts = [
      { assessmentId: firstQuiz[0]?.id, score: 80, passed: true, correct: 4, total: 5, daysAgo: 8 },
      { assessmentId: firstQuiz[1]?.id, score: 60, passed: false, correct: 3, total: 5, daysAgo: 2 },
    ].filter((row) => row.assessmentId);

    for (const row of seededAttempts) {
      const submittedAt = new Date();
      submittedAt.setDate(submittedAt.getDate() - row.daysAgo);
      const [attempt] = await db
        .insert(assessmentAttempts)
        .values({
          assessmentId: row.assessmentId as number,
          profileId: student.id,
          score: row.score,
          passed: row.passed,
          correctCount: row.correct,
          totalCount: row.total,
          passMark: 80,
          submittedAt,
        })
        .returning({ id: assessmentAttempts.id });

      const questionRows = await db
        .select()
        .from(assessmentQuestions)
        .where(eq(assessmentQuestions.assessmentId, row.assessmentId as number));
      await db.insert(assessmentAnswers).values(
        questionRows.map((question, index) => ({
          attemptId: attempt.id,
          questionId: question.id,
          selectedIndex: index < row.correct ? question.correctIndex : (question.correctIndex + 1) % question.options.length,
          isCorrect: index < row.correct,
        })),
      );
    }
  }

  // Group work
  if (student && mentor && admin) {
    const [group] = await db
      .insert(courseGroups)
      .values({
        courseId: courseRows.find((row) => row.slug === "purpose-discovery-clarity")?.id ?? courseRows[0]?.id ?? null,
        name: "Clarity Panel B",
        brief:
          "Together, test each member's purpose statement against the four-part test, then produce one shared panel summary: three statements, the evidence for each and the limit each member accepts.",
        mentorId: mentor.id,
      })
      .returning({ id: courseGroups.id });

    await db.insert(groupMembers).values([
      { groupId: group.id, profileId: student.id, role: "lead" },
      { groupId: group.id, profileId: mentor.id, role: "member" },
      { groupId: group.id, profileId: admin.id, role: "member" },
    ]);

    await db.insert(groupSubmissions).values({
      groupId: group.id,
      title: "Clarity Panel B — purpose statements and limits",
      body: `Three statements survived the four-part test.

1. Joan — "I help early-career analysts learn to read numbers honestly, so decisions stop being guesses." Evidence: the reconciliation sheet the department still uses; two colleagues asked for walkthroughs. Limit: not sent to teach public speaking.

2. Miriam — "I coach people through clarity so their gifts stop being rumours." Evidence: twelve completed clarity sessions with written notes.

3. Alex — "I build learning rooms where purpose is discovered, not announced." Evidence: 600+ participants across 15 cohorts.

Shared finding: each statement needed a limit before it felt truthful.`,
      status: "reviewed",
      score: 88,
      feedback:
        "Strong work. The panel summary is specific and the limits are honest — that is the hardest part. Gap: no agreement on how the group will test these statements with outsiders. Next action: each member runs the two-person test this week and posts the verbatim feedback in the live feed.",
      submittedById: student.id,
      reviewedById: mentor.id,
      submittedAt: new Date(Date.now() - 4 * 86400000),
      reviewedAt: new Date(Date.now() - 3 * 86400000),
    });
  }

  // Complete the first Foundation course for the demo student so certificates demonstrate themselves.
  if (student) {
    const course = courseRows.find((row) => row.slug === "understanding-purpose");
    if (course) {
      const modules = await db.select().from(courseModules).where(eq(courseModules.courseId, course.id));
      for (const courseModule of modules) {
        const lessonRows = await db.select().from(lessons).where(eq(lessons.moduleId, courseModule.id));
        for (const lesson of lessonRows) {
          await db
            .insert(lessonProgress)
            .values({
              profileId: student.id,
              lessonId: lesson.id,
              status: "completed",
              completedAt: new Date(Date.now() - 5 * 86400000),
            })
            .onConflictDoUpdate({
              target: [lessonProgress.profileId, lessonProgress.lessonId],
              set: { status: "completed", completedAt: new Date(Date.now() - 5 * 86400000) },
            });
        }
      }
      await synchronizeCertificates(student.id);
    }
  }

  return { levelExams: Object.keys(levelExamIds).length };
}
