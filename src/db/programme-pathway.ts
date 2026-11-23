import { asc, eq } from "drizzle-orm";
import { courseLevels, programmeLevels } from "@/db/schema";
import type { Transaction } from "@/db/actor";

/**
 * Resolve one level inside its own programme pathway.
 *
 * Levels created before the programme catalogue was introduced have no
 * programmeLevelId. Those legacy rows retain their original global ordering
 * until an administrator links them to a programme.
 */
export async function getLevelPathway(tx: Transaction, levelId: number) {
  const levels = await tx
    .select({
      level: courseLevels,
      programmeId: programmeLevels.programmeId,
      programmeSortOrder: programmeLevels.sortOrder,
    })
    .from(courseLevels)
    .leftJoin(
      programmeLevels,
      eq(programmeLevels.id, courseLevels.programmeLevelId),
    )
    .orderBy(
      asc(programmeLevels.sortOrder),
      asc(courseLevels.sortOrder),
      asc(courseLevels.levelNumber),
      asc(courseLevels.id),
    );
  const target = levels.find((candidate) => candidate.level.id === levelId);
  if (!target) return null;

  const pathway = levels.filter(
    (candidate) => candidate.programmeId === target.programmeId,
  );
  const index = pathway.findIndex(
    (candidate) => candidate.level.id === target.level.id,
  );
  return {
    level: target.level,
    programmeId: target.programmeId,
    isFirst: index === 0,
    previousLevel: index > 0 ? pathway[index - 1].level : null,
  };
}
