import { ACADEMIC_PROGRAMMES } from "./academic-programmes";

export type ProgrammeCatalogue = {
  slug: string;
  name: string;
  duration: string;
  structure: string;
  description: string;
  levels: { slug: string; name: string; modules: string[] }[];
};

export const PROGRAMME_CATALOGUE: ProgrammeCatalogue[] = ACADEMIC_PROGRAMMES.map((programme) => ({
  slug: programme.slug,
  name: programme.name,
  duration: programme.duration,
  structure: programme.structure,
  description: programme.description,
  levels: programme.levels.map((level) => ({
    slug: level.slug,
    name: level.name,
    modules: level.modules.map((module) => `${module.code} – ${module.title}`),
  })),
}));
