import type { ModuleContent } from "../types";
import { ADULTS_LEVEL_1 } from "./adults-l1";
import { ADULTS_LEVEL_2 } from "./adults-l2";
import { ADULTS_LEVEL_3 } from "./adults-l3";

/*
 * Authored teaching content for every module, keyed "<programme slug>/<module code>".
 * Each module has one lesson per key learning area (YouLead! adds a fifth,
 * integrating lesson), five quiz items and its share of the level examination.
 */
const byProgramme: Record<string, Record<string, ModuleContent>[]> = {
  "purpose-program-adults": [ADULTS_LEVEL_1, ADULTS_LEVEL_2, ADULTS_LEVEL_3],
};

export const MODULE_CONTENT: Record<string, ModuleContent> = Object.fromEntries(
  Object.entries(byProgramme).flatMap(([programme, levels]) =>
    levels.flatMap((level) => Object.entries(level).map(([code, content]) => [`${programme}/${code}`, content])),
  ),
);
