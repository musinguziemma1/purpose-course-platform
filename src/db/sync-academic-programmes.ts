import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  assessmentQuestions,
  assessments,
  assignments,
  courseLevels,
  courseModules,
  courses,
  lessons,
  programmeLevels,
  programmeModules,
  programmes,
} from "./schema";
import {
  ACADEMIC_PROGRAMMES,
  academicModuleKey,
  type AcademicModule,
} from "../lib/academic-programmes";

const LEVEL_IMAGES: Record<string, string> = {
  "purpose-program-adults": "/images/level-foundation.jpg",
  "purpose-program-students": "/images/student-study.jpg",
  youlead: "/images/hero-workshop.jpg",
  "purpose-to-peace": "/images/community.jpg",
};

const normalize = (value: string) =>
  value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");

const formativePrompts = (module: AcademicModule) =>
  module.concepts.map(
    (concept) =>
      `Explain this principle in your own words, illustrate it with a realistic example, and identify one responsible application: ${concept}`,
  );

const assignmentBrief = (module: AcademicModule) =>
  `Prepare an evidence-based application portfolio for ${module.code} – ${module.title}. Address all five taught principles, apply them to a real personal, relational, educational, organisational or community context, and conclude with a specific action plan. Submit 700–1,000 words or an equivalent structured presentation. Your work will be assessed for conceptual accuracy, quality of evidence, ethical reasoning, practical application and clarity.`;

const teachingBody = (module: AcademicModule, concept: string, index: number) => `# ${module.code}: Principle ${index + 1}

## Core explanation

${concept}

This principle should be understood as a claim that guides reflection and action. It is not a slogan or a substitute for evidence. A strong response identifies what the principle means, distinguishes it from a common misconception, and demonstrates how it affects an actual decision.

## Academic application

Analyse a relevant personal, relational, educational, organisational or community situation. Identify the available evidence, the people affected, the values at stake and the likely consequences of each option. Apply the principle without ignoring context, responsibility or the dignity of others.

## Reflective check

1. What evidence supports your interpretation?
2. Which assumption might distort your judgement?
3. What responsible action follows from the principle?
4. How will you evaluate the result and learn from it?

Record your response in your learning journal before continuing.`;

const distractors = [
  "Public recognition and rapid results are the most reliable measures of purposeful growth.",
  "Good intentions are sufficient even when evidence, responsibility and consequences are ignored.",
  "A principle should be adopted without reflection whenever it is popular or culturally familiar.",
  "Ethical character becomes optional when the desired outcome appears beneficial.",
  "Purpose is a private idea that should not influence practical choices or contribution.",
];

function questionFor(module: AcademicModule, concept: string, index: number, exam = false) {
  const correctIndex = index % 4;
  const alternatives = [
    distractors[index % distractors.length],
    distractors[(index + 2) % distractors.length],
    distractors[(index + 4) % distractors.length],
  ];
  const options = alternatives.toSpliced(correctIndex, 0, concept);
  return {
    prompt: exam
      ? `Within ${module.code}, which statement best represents taught principle ${index + 1}?`
      : `Which statement best reflects principle ${index + 1} in ${module.code}?`,
    options,
    correctIndex,
    explanation: `${concept} The aligned lesson requires learners to interpret this claim with evidence, ethical responsibility and a concrete application.`,
  };
}

async function replaceQuestionSet(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  assessmentId: number,
  questions: ReturnType<typeof questionFor>[],
) {
  const existing = await tx
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.sortOrder), asc(assessmentQuestions.id));

  for (const [index, question] of questions.entries()) {
    const values = { ...question, sortOrder: index + 1 };
    if (existing[index]) {
      await tx
        .update(assessmentQuestions)
        .set(values)
        .where(eq(assessmentQuestions.id, existing[index].id));
    } else {
      await tx.insert(assessmentQuestions).values({ assessmentId, ...values });
    }
  }

  for (const staleQuestion of existing.slice(questions.length)) {
    await tx
      .delete(assessmentQuestions)
      .where(eq(assessmentQuestions.id, staleQuestion.id));
  }
}

export async function syncAcademicProgrammes(options: { includeAssessments?: boolean } = {}) {
  const includeAssessments = options.includeAssessments ?? true;

  return db.transaction(async (tx) => {
    let levelCount = 0;
    let moduleCount = 0;
    let lessonCount = 0;
    let assignmentCount = 0;
    let assessmentCount = 0;
    let questionCount = 0;

    for (const [programmeIndex, programmeSeed] of ACADEMIC_PROGRAMMES.entries()) {
      const [programme] = await tx
        .insert(programmes)
        .values({
          slug: programmeSeed.slug,
          name: programmeSeed.name,
          duration: programmeSeed.duration,
          structure: programmeSeed.structure,
          description: programmeSeed.description,
          status: "published",
          sortOrder: programmeIndex + 1,
        })
        .onConflictDoUpdate({
          target: programmes.slug,
          set: {
            name: sql`excluded.name`,
            duration: sql`excluded.duration`,
            structure: sql`excluded.structure`,
            description: sql`excluded.description`,
            status: "published",
            sortOrder: sql`excluded.sort_order`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: programmes.id });

      for (const [levelIndex, levelSeed] of programmeSeed.levels.entries()) {
        const examConcepts = levelSeed.modules.flatMap((module) =>
          module.concepts
            .slice(0, levelSeed.modules.length === 5 ? 4 : 5)
            .map((concept, conceptIndex) => ({ module, concept, conceptIndex })),
        );
        const examPrompts = examConcepts.map(
          ({ module, concept }) => `Explain and apply the ${module.code} principle: ${concept}`,
        );
        const [programmeLevel] = await tx
          .insert(programmeLevels)
          .values({
            programmeId: programme.id,
            slug: levelSeed.slug,
            name: levelSeed.name,
            introduction: levelSeed.introduction,
            outcomes: levelSeed.outcomes,
            examPrompts,
            sortOrder: levelIndex + 1,
          })
          .onConflictDoUpdate({
            target: [programmeLevels.programmeId, programmeLevels.slug],
            set: {
              name: sql`excluded.name`,
              introduction: sql`excluded.introduction`,
              outcomes: sql`excluded.outcomes`,
              examPrompts: sql`excluded.exam_prompts`,
              sortOrder: sql`excluded.sort_order`,
            },
          })
          .returning({ id: programmeLevels.id });

        const [level] = await tx
          .insert(courseLevels)
          .values({
            programmeLevelId: programmeLevel.id,
            slug: levelSeed.digitalLevelSlug,
            name: levelSeed.name,
            levelNumber: levelIndex + 1,
            tagline: levelSeed.tagline,
            description: levelSeed.introduction,
            weeks: levelSeed.weeks,
            accent: levelSeed.accent,
            passMark: levelSeed.passMark,
            icon: levelSeed.icon,
            imageUrl: LEVEL_IMAGES[programmeSeed.slug],
            outcomes: levelSeed.outcomes,
            sortOrder: programmeIndex * 10 + levelIndex + 1,
          })
          .onConflictDoUpdate({
            target: courseLevels.slug,
            set: {
              programmeLevelId: programmeLevel.id,
              name: sql`excluded.name`,
              levelNumber: sql`excluded.level_number`,
              tagline: sql`excluded.tagline`,
              description: sql`excluded.description`,
              weeks: sql`excluded.weeks`,
              accent: sql`excluded.accent`,
              passMark: sql`excluded.pass_mark`,
              icon: sql`excluded.icon`,
              imageUrl: sql`excluded.image_url`,
              outcomes: sql`excluded.outcomes`,
              sortOrder: sql`excluded.sort_order`,
            },
          })
          .returning({ id: courseLevels.id });

        const [course] = await tx
          .insert(courses)
          .values({
            levelId: level.id,
            slug: levelSeed.courseSlug,
            title: levelSeed.name,
            subtitle: programmeSeed.name,
            summary: levelSeed.introduction,
            description: `${programmeSeed.description}\n\n${levelSeed.introduction}`,
            coverImageUrl: LEVEL_IMAGES[programmeSeed.slug],
            accent: levelSeed.accent,
            estimatedHours: levelSeed.modules.length * 4,
            status: "published",
            isSequential: true,
            sortOrder: 1,
          })
          .onConflictDoUpdate({
            target: courses.slug,
            set: {
              levelId: level.id,
              title: sql`excluded.title`,
              subtitle: sql`excluded.subtitle`,
              summary: sql`excluded.summary`,
              description: sql`excluded.description`,
              coverImageUrl: sql`excluded.cover_image_url`,
              accent: sql`excluded.accent`,
              estimatedHours: sql`excluded.estimated_hours`,
              status: "published",
              isSequential: true,
              sortOrder: 1,
              updatedAt: new Date(),
            },
          })
          .returning({ id: courses.id });

        levelCount += 1;
        const moduleRecords: { module: AcademicModule; courseModuleId: number; key: string }[] = [];

        for (const [moduleIndex, moduleSeed] of levelSeed.modules.entries()) {
          const moduleSlug = `module-${moduleIndex + 1}`;
          const prompts = formativePrompts(moduleSeed);
          const brief = assignmentBrief(moduleSeed);
          const [programmeModule] = await tx
            .insert(programmeModules)
            .values({
              programmeLevelId: programmeLevel.id,
              slug: moduleSlug,
              title: `${moduleSeed.code} – ${moduleSeed.title}`,
              code: moduleSeed.code,
              introduction: moduleSeed.summary,
              outcomes: moduleSeed.concepts,
              formativePrompts: prompts,
              assignmentBrief: brief,
              sortOrder: moduleIndex + 1,
            })
            .onConflictDoUpdate({
              target: [programmeModules.programmeLevelId, programmeModules.slug],
              set: {
                title: sql`excluded.title`,
                code: sql`excluded.code`,
                introduction: sql`excluded.introduction`,
                outcomes: sql`excluded.outcomes`,
                formativePrompts: sql`excluded.formative_prompts`,
                assignmentBrief: sql`excluded.assignment_brief`,
                sortOrder: sql`excluded.sort_order`,
              },
            })
            .returning({ id: programmeModules.id });

          const [courseModule] = await tx
            .insert(courseModules)
            .values({
              programmeModuleId: programmeModule.id,
              courseId: course.id,
              slug: moduleSlug,
              title: `${moduleSeed.code} – ${moduleSeed.title}`,
              summary: moduleSeed.summary,
              sessionCode: moduleSeed.code,
              estimatedMinutes: 150,
              isPreview: programmeIndex === 0 && levelIndex === 0 && moduleIndex === 0,
              sortOrder: moduleIndex + 1,
            })
            .onConflictDoUpdate({
              target: [courseModules.courseId, courseModules.slug],
              set: {
                programmeModuleId: programmeModule.id,
                title: sql`excluded.title`,
                summary: sql`excluded.summary`,
                sessionCode: sql`excluded.session_code`,
                estimatedMinutes: sql`excluded.estimated_minutes`,
                isPreview: sql`excluded.is_preview`,
                sortOrder: sql`excluded.sort_order`,
              },
            })
            .returning({ id: courseModules.id });

          for (const [conceptIndex, concept] of moduleSeed.concepts.entries()) {
            const lessonSlug = `academic-principle-${conceptIndex + 1}`;
            await tx
              .insert(lessons)
              .values({
                moduleId: courseModule.id,
                slug: lessonSlug,
                title: `Principle ${conceptIndex + 1}: ${concept.split(/[.;]/)[0]}`,
                kind: conceptIndex === 4 ? "practice" : "reading",
                summary: concept,
                body: teachingBody(moduleSeed, concept, conceptIndex),
                practicePrompt: prompts[conceptIndex],
                durationMinutes: 20,
                isPreview: false,
                status: "published",
                sortOrder: 20 + conceptIndex,
              })
              .onConflictDoUpdate({
                target: [lessons.moduleId, lessons.slug],
                set: {
                  title: sql`excluded.title`,
                  kind: sql`excluded.kind`,
                  summary: sql`excluded.summary`,
                  body: sql`excluded.body`,
                  practicePrompt: sql`excluded.practice_prompt`,
                  durationMinutes: sql`excluded.duration_minutes`,
                  status: "published",
                  sortOrder: sql`excluded.sort_order`,
                },
              });
            lessonCount += 1;
          }

          const key = academicModuleKey(programmeSeed.slug, levelSeed.slug, moduleSeed.code);
          await tx
            .insert(assignments)
            .values({
              curriculumKey: `assignment:${key}`,
              levelId: level.id,
              moduleId: courseModule.id,
              title: `${moduleSeed.code} – Applied learning assignment`,
              brief,
              sortOrder: moduleIndex + 1,
            })
            .onConflictDoUpdate({
              target: assignments.curriculumKey,
              set: {
                levelId: level.id,
                moduleId: courseModule.id,
                title: sql`excluded.title`,
                brief: sql`excluded.brief`,
                sortOrder: sql`excluded.sort_order`,
              },
            });

          assignmentCount += 1;
          moduleCount += 1;
          moduleRecords.push({ module: moduleSeed, courseModuleId: courseModule.id, key });
        }

        if (!includeAssessments) continue;

        for (const [moduleIndex, record] of moduleRecords.entries()) {
          const curriculumKey = `quiz:${record.key}`;
          let [assessment] = await tx
            .select({ id: assessments.id })
            .from(assessments)
            .where(eq(assessments.curriculumKey, curriculumKey))
            .limit(1);
          if (!assessment) {
            [assessment] = await tx
              .select({ id: assessments.id })
              .from(assessments)
              .where(and(eq(assessments.kind, "session"), eq(assessments.moduleId, record.courseModuleId)))
              .limit(1);
          }

          const values = {
            curriculumKey,
            kind: "session" as const,
            levelId: level.id,
            courseId: course.id,
            moduleId: record.courseModuleId,
            title: `${record.module.code} – Module Quiz`,
            description: `Five aligned questions covering the five taught principles in ${record.module.code}.`,
            passMark: levelSeed.passMark,
            timeLimitMinutes: 15,
            maxAttempts: 3,
            isRequired: true,
            status: "published" as const,
            sortOrder: moduleIndex + 1,
          };
          if (assessment) {
            await tx.update(assessments).set(values).where(eq(assessments.id, assessment.id));
          } else {
            [assessment] = await tx.insert(assessments).values(values).returning({ id: assessments.id });
          }

          const quizQuestions = record.module.concepts.map((concept, index) =>
            questionFor(record.module, concept, index),
          );
          await replaceQuestionSet(tx, assessment.id, quizQuestions);
          assessmentCount += 1;
          questionCount += quizQuestions.length;
        }

        const examKey = `exam:${programmeSeed.slug}:${levelSeed.slug}`;
        let [exam] = await tx
          .select({ id: assessments.id })
          .from(assessments)
          .where(eq(assessments.curriculumKey, examKey))
          .limit(1);
        if (!exam) {
          [exam] = await tx
            .select({ id: assessments.id })
            .from(assessments)
            .where(and(eq(assessments.kind, "level"), eq(assessments.levelId, level.id)))
            .limit(1);
        }

        const examValues = {
          curriculumKey: examKey,
          kind: "level" as const,
          levelId: level.id,
          courseId: course.id,
          moduleId: null,
          title: `${programmeSeed.name}: ${levelSeed.name} Examination`,
          description: `${examConcepts.length} aligned questions assessing all modules in this level. Every question includes an academic teaching explanation.`,
          passMark: levelSeed.passMark,
          timeLimitMinutes: examConcepts.length <= 15 ? 35 : 45,
          maxAttempts: 3,
          isRequired: true,
          status: "published" as const,
          sortOrder: levelIndex + 1,
        };
        if (exam) {
          await tx.update(assessments).set(examValues).where(eq(assessments.id, exam.id));
        } else {
          [exam] = await tx.insert(assessments).values(examValues).returning({ id: assessments.id });
        }
        const levelQuestions = examConcepts.map(({ module, concept, conceptIndex }) =>
          questionFor(module, concept, conceptIndex, true),
        );
        await replaceQuestionSet(tx, exam.id, levelQuestions);
        assessmentCount += 1;
        questionCount += levelQuestions.length;
      }
    }

    return {
      programmes: ACADEMIC_PROGRAMMES.length,
      levels: levelCount,
      modules: moduleCount,
      lessons: lessonCount,
      assignments: assignmentCount,
      assessments: assessmentCount,
      questions: questionCount,
    };
  });
}
