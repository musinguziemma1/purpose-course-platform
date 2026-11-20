const PROGRAMME_STAGES = ["Foundation", "Intermediate", "Advanced"] as const;

type ProgrammeOutlineForStages = {
  id: number;
  name: string;
  slug: string;
  levels: {
    id: number;
    name: string;
    modules: { id: number; title: string }[];
  }[];
};

export function getProgrammeStageName(levelIndex: number) {
  return PROGRAMME_STAGES[levelIndex] ?? `Level ${levelIndex + 1}`;
}

export function getProgrammeLevelPresentation(name: string, levelIndex: number) {
  const stage = getProgrammeStageName(levelIndex);
  const trimmedName = name.trim();
  const levelPrefix = new RegExp(`^Level\\s*${levelIndex + 1}\\s*[-–—:]\\s*`, "i");
  const stagePrefix = new RegExp(`^${stage}\\s*[-–—:]\\s*`, "i");
  const focus = trimmedName.replace(levelPrefix, "").replace(stagePrefix, "").trim();

  return { stage, focus: focus || trimmedName };
}

export function groupProgrammeOutlinesByStage<T extends ProgrammeOutlineForStages>(programmes: T[]) {
  const levelCount = programmes.reduce((highest, programme) => Math.max(highest, programme.levels.length), 0);

  return Array.from({ length: levelCount }, (_, levelIndex) => ({
    levelIndex,
    stage: getProgrammeStageName(levelIndex),
    items: programmes.flatMap((programme) => {
      const level = programme.levels[levelIndex];
      return level
        ? [{ programme, level, focus: getProgrammeLevelPresentation(level.name, levelIndex).focus }]
        : [];
    }),
  })).filter((group) => group.items.length > 0);
}
