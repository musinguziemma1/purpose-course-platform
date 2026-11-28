import type { AcademicCapstone, AcademicModule } from "../academic-programmes";
import type { WorkbookArea } from "./types";

/*
 * Turns workbook text and authored content into what learners read. Output
 * uses only the markdown the lesson page renders (src/lib/markdown.tsx):
 * ## / ### headings, > quotes, - and 1. lists, --- rules and :::callout.
 */

const INTEGRATION_AREA: WorkbookArea = {
  title: "Roundtable Integration: Putting the Four Together",
  description: "Bringing the module's four topics together in one real decision, practised in your roundtable and reviewed with your accountability partner.",
};

/** The key learning area a lesson teaches. YouLead! modules add a fifth, integrating lesson. */
export function lessonArea(module: AcademicModule, lessonIndex: number): WorkbookArea {
  return module.keyAreas[lessonIndex] ?? INTEGRATION_AREA;
}

const paragraphs = (...blocks: (string | false | null | undefined)[]) => blocks.filter(Boolean).join("\n\n");

export function lessonBody(module: AcademicModule, lessonIndex: number): string {
  const lesson = module.content.lessons[lessonIndex];
  const area = lessonArea(module, lessonIndex);
  const isFirst = lessonIndex === 0;
  const isLast = lessonIndex === module.content.lessons.length - 1;
  return paragraphs(
    isFirst && `## Welcome to ${module.code} – ${module.title}`,
    isFirst && module.introduction,
    isFirst && "**By the end of this module you will be able to:**",
    isFirst && module.objectives.map((objective, index) => `${index + 1}. ${objective}`).join("\n"),
    isFirst && "---",
    `## ${area.title}`,
    `> ${area.description}`,
    lesson.hook,
    ...lesson.teaching,
    "### In practice",
    lesson.inPractice.map((item) => `- ${item}`).join("\n"),
    `:::callout ${lesson.insight}`,
    isLast && "---",
    isLast && "### Reflect and record",
    isLast && "Take quiet time to answer your workbook reflections in your journal:",
    isLast && module.reflections.map((reflection) => `- ${reflection}`).join("\n"),
    isLast && "### Looking ahead",
    isLast && module.nextModule,
  );
}

/** The module's written assessment: the workbook's five questions and its two reflections. */
export function moduleAssignmentBrief(module: AcademicModule): string {
  return [
    module.output ? `Output: ${module.output}.` : null,
    `Complete the ${module.code} module assessment from your workbook. Answer each question in full sentences, drawing on the lessons and on your own experience:`,
    module.assessmentQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n"),
    "Then respond in your journal to the two workbook reflection prompts:",
    module.reflections.map((reflection) => `- ${reflection}`).join("\n"),
    "Your mentor or facilitator reviews your answers for understanding, honest reflection and a practical commitment you will act on.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function capstoneBrief(capstone: AcademicCapstone): string {
  return [
    capstone.introduction,
    capstone.prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n"),
    "Submit your completed portfolio for review and sign-off by your mentor or facilitator.",
  ].join("\n\n");
}
