export type ProgrammeLevelForPublishing = {
  name: string;
  modules: { title: string }[];
};

export function programmeOutlinePublishError(levels: ProgrammeLevelForPublishing[]) {
  if (!levels.length) return "Add at least one level before publishing this outline.";
  if (levels.some((level) => !level.name.trim())) return "Give every level a name before publishing.";
  if (levels.some((level) => !level.modules.length)) return "Add at least one module to every level before publishing.";
  if (levels.some((level) => level.modules.some((module) => !module.title.trim()))) {
    return "Give every module a title before publishing.";
  }
  return null;
}
