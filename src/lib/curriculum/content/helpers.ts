import type { AssessmentItem, LessonContent } from "../types";

/** A scored item: the prompt, four options, the index of the correct one and why it is correct. */
export const q = (
  prompt: string,
  options: AssessmentItem["options"],
  correctIndex: AssessmentItem["correctIndex"],
  explanation: string,
): AssessmentItem => ({ prompt, options, correctIndex, explanation });

/** A taught lesson for one key learning area. */
export const lesson = (content: LessonContent): LessonContent => content;
