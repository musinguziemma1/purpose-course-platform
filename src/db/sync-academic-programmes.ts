import { and, asc, eq, inArray, like, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import {
  assessmentQuestions,
  assessments,
  assignments,
  courseLevels,
  courseModules,
  courseSessions,
  courses,
  lessons,
  programmeLevels,
  programmeModules,
  programmes,
} from "./schema";
import {
  ACADEMIC_PROGRAMMES,
  RENAMED_SLUGS,
  academicSessionDesign,
  academicModuleKey,
  type AcademicModule,
} from "../lib/academic-programmes";
import { capstoneBrief, lessonArea, lessonBody, moduleAssignmentBrief } from "../lib/curriculum/compose";
import type { AssessmentItem } from "../lib/curriculum/types";

const LEVEL_IMAGES: Record<string, string> = {
  "purpose-program-adults": "/images/level-foundation.jpg",
  "purpose-program-schools": "/images/student-study.jpg",
  youlead: "/images/hero-workshop.jpg",
  "purpose-to-peace": "/images/community.jpg",
};

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type QuestionValues = Pick<AssessmentItem, "prompt" | "options" | "correctIndex" | "explanation">;

const asQuestion = (item: AssessmentItem): QuestionValues => ({
  prompt: item.prompt,
  options: [...item.options],
  correctIndex: item.correctIndex,
  explanation: item.explanation,
});

/**
 * Rewrites an assessment's questions in place, in order. Updating existing
 * rows (rather than deleting them) keeps every learner's recorded answers and
 * scores attached; only surplus questions beyond the new set are removed.
 */
async function replaceQuestionSet(tx: Transaction, assessmentId: number, questions: QuestionValues[]) {
  const existing = await tx
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.sortOrder), asc(assessmentQuestions.id));

  for (const [index, question] of questions.entries()) {
    const values = { ...question, sortOrder: index + 1 };
    if (existing[index]) {
      await tx.update(assessmentQuestions).set(values).where(eq(assessmentQuestions.id, existing[index].id));
    } else {
      await tx.insert(assessmentQuestions).values({ assessmentId, ...values });
    }
  }

  for (const staleQuestion of existing.slice(questions.length)) {
    await tx.delete(assessmentQuestions).where(eq(assessmentQuestions.id, staleQuestion.id));
  }
}

/** Renames slugs in place (same ids) when the target slug is not taken yet. */
async function applySlugRenames(tx: Transaction) {
  const tables = { programmes, courseLevels, courses } as const;
  for (const [name, pairs] of Object.entries(RENAMED_SLUGS) as [keyof typeof tables, readonly (readonly [string, string])[]][]) {
    const table = tables[name];
    const taken = alias(table, "taken");
    for (const [from, to] of pairs) {
      await tx
        .update(table)
        .set({ slug: to })
        .where(and(eq(table.slug, from), notExists(tx.select({ id: taken.id }).from(taken).where(eq(taken.slug, to)))));
    }
  }
}

export async function syncAcademicProgrammes(options: { includeAssessments?: boolean } = {}) {
  const includeAssessments = options.includeAssessments ?? true;

  return db.transaction(async (tx) => {
    await applySlugRenames(tx);

    let levelCount = 0;
    let moduleCount = 0;
    let lessonCount = 0;
    let assignmentCount = 0;
    let capstoneCount = 0;
    let sessionCount = 0;
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
        const examItems = levelSeed.modules.flatMap((module) => module.content.exam);
        const [programmeLevel] = await tx
          .insert(programmeLevels)
          .values({
            programmeId: programme.id,
            slug: levelSeed.slug,
            name: levelSeed.name,
            introduction: levelSeed.introduction,
            outcomes: levelSeed.outcomes,
            examPrompts: examItems.map((item) => item.prompt),
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
          const brief = moduleAssignmentBrief(moduleSeed);
          const [programmeModule] = await tx
            .insert(programmeModules)
            .values({
              programmeLevelId: programmeLevel.id,
              slug: moduleSlug,
              title: `${moduleSeed.code} – ${moduleSeed.title}`,
              code: moduleSeed.code,
              introduction: moduleSeed.introduction,
              outcomes: moduleSeed.objectives,
              formativePrompts: moduleSeed.reflections,
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
              summary: moduleSeed.focus,
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

          // A session whose module code changed (STU 101 → PURP 101) keeps its id, so attendance and progress carry over.
          const sessionAtSlot = alias(courseSessions, "session_at_slot");
          await tx
            .update(courseSessions)
            .set({ code: moduleSeed.code })
            .where(
              and(
                eq(courseSessions.levelId, level.id),
                eq(courseSessions.sortOrder, moduleIndex + 1),
                notExists(
                  tx
                    .select({ id: sessionAtSlot.id })
                    .from(sessionAtSlot)
                    .where(and(eq(sessionAtSlot.levelId, level.id), eq(sessionAtSlot.code, moduleSeed.code))),
                ),
              ),
            );
          const session = academicSessionDesign(programmeSeed, moduleSeed, moduleIndex, levelSeed.modules.length);
          await tx
            .insert(courseSessions)
            .values({
              levelId: level.id,
              code: moduleSeed.code,
              title: moduleSeed.title,
              summary: session.summary,
              focusQuestions: session.focusQuestions,
              format: session.format,
              durationMinutes: session.durationMinutes,
              sortOrder: moduleIndex + 1,
            })
            .onConflictDoUpdate({
              target: [courseSessions.levelId, courseSessions.code],
              set: {
                title: sql`excluded.title`,
                summary: sql`excluded.summary`,
                focusQuestions: sql`excluded.focus_questions`,
                format: sql`excluded.format`,
                durationMinutes: sql`excluded.duration_minutes`,
                sortOrder: sql`excluded.sort_order`,
              },
            });
          sessionCount += 1;

          // Lesson slugs are stable (academic-principle-N): rewriting them in place keeps learners' progress.
          for (const [lessonIndex, lesson] of moduleSeed.content.lessons.entries()) {
            const area = lessonArea(moduleSeed, lessonIndex);
            await tx
              .insert(lessons)
              .values({
                moduleId: courseModule.id,
                slug: `academic-principle-${lessonIndex + 1}`,
                title: area.title,
                kind: lessonIndex === moduleSeed.content.lessons.length - 1 ? "practice" : "reading",
                summary: area.description,
                body: lessonBody(moduleSeed, lessonIndex),
                practicePrompt: lesson.practice,
                durationMinutes: lessonIndex === 0 ? 25 : 20,
                isPreview: false,
                status: "published",
                sortOrder: 20 + lessonIndex,
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
          // Retire generated lessons beyond the module's current set (kept, not deleted, for learner history).
          const surplus = Array.from({ length: 10 }, (_, index) => `academic-principle-${moduleSeed.content.lessons.length + index + 1}`);
          await tx
            .update(lessons)
            .set({ status: "draft" })
            .where(and(eq(lessons.moduleId, courseModule.id), inArray(lessons.slug, surplus)));

          const key = academicModuleKey(programmeSeed.slug, levelSeed.slug, moduleSeed.code);
          const assignmentValues = {
            curriculumKey: `assignment:${key}`,
            levelId: level.id,
            moduleId: courseModule.id,
            title: `${moduleSeed.code} – ${moduleSeed.output ?? "Module assessment"}`,
            brief,
            sortOrder: moduleIndex + 1,
          };
          // A key can change with a renamed programme or module code; the module's existing assignment is reused.
          const [existingAssignment] = await tx
            .select({ id: assignments.id })
            .from(assignments)
            .where(and(eq(assignments.moduleId, courseModule.id), like(assignments.curriculumKey, "assignment:%")))
            .limit(1);
          if (existingAssignment) {
            await tx.update(assignments).set(assignmentValues).where(eq(assignments.id, existingAssignment.id));
          } else {
            await tx
              .insert(assignments)
              .values(assignmentValues)
              .onConflictDoUpdate({
                target: assignments.curriculumKey,
                set: { levelId: level.id, moduleId: courseModule.id, title: sql`excluded.title`, brief: sql`excluded.brief`, sortOrder: sql`excluded.sort_order` },
              });
          }

          assignmentCount += 1;
          moduleCount += 1;
          moduleRecords.push({ module: moduleSeed, courseModuleId: courseModule.id, key });
        }

        if (levelSeed.capstone) {
          await tx
            .insert(assignments)
            .values({
              curriculumKey: `capstone:${programmeSeed.slug}:${levelSeed.slug}`,
              levelId: level.id,
              moduleId: null,
              title: `Level capstone – ${levelSeed.capstone.title}`,
              brief: capstoneBrief(levelSeed.capstone),
              sortOrder: 100,
            })
            .onConflictDoUpdate({
              target: assignments.curriculumKey,
              set: { levelId: level.id, title: sql`excluded.title`, brief: sql`excluded.brief`, sortOrder: sql`excluded.sort_order` },
            });
          capstoneCount += 1;
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
            description: `${record.module.content.quiz.length} questions on the key learning areas of ${record.module.code} – ${record.module.title}.`,
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

          const quizQuestions = record.module.content.quiz.map(asQuestion);
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
          description: `${examItems.length} questions covering every module in this level. Each answer is explained after you submit.`,
          passMark: levelSeed.passMark,
          timeLimitMinutes: examItems.length <= 15 ? 35 : 45,
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
        const levelQuestions = examItems.map(asQuestion);
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
      capstones: capstoneCount,
      sessions: sessionCount,
      assessments: assessmentCount,
      questions: questionCount,
    };
  });
}
