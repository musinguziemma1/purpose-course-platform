/** A key learning area from a workbook's Section D: "Title: description". */
export type WorkbookArea = { title: string; description: string };

/** One module as written in its workbook (Sections A–G), verbatim. */
export type WorkbookModule = {
  number: number;
  code: string | null;
  title: string;
  levelIntroduction: string;
  introduction: string;
  objectives: string[];
  keyAreas: WorkbookArea[];
  reflections: string[];
  assessmentQuestions: string[];
  nextModule: string;
};

export type WorkbookLevel = { source: string; overview: string; modules: WorkbookModule[] };

/** programme slug → level number → workbook level. */
export type WorkbookLibrary = Record<string, Record<string, WorkbookLevel>>;

/**
 * A taught lesson for one key learning area, written to move a learner from
 * understanding to practice: an opening that meets them where they live, the
 * teaching itself, what it looks like in real life, one memorable truth and an
 * exercise to do before the next lesson.
 */
export type LessonContent = {
  hook: string;
  teaching: string[];
  inPractice: string[];
  insight: string;
  practice: string;
};

/** A scored multiple-choice item: four options, one correct, with the reason. */
export type AssessmentItem = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
};

/** Authored teaching content for one module. */
export type ModuleContent = {
  lessons: LessonContent[];
  quiz: AssessmentItem[];
  exam: AssessmentItem[];
};
