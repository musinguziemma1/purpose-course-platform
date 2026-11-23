import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { courseLevels, programmeLevels, programmes } from "@/db/schema";

/** Programme-qualified labels prevent ambiguous Foundation/Intermediate rows. */
export async function getProgrammeLevelOptions() {
  const rows = await db
    .select({
      id: courseLevels.id,
      levelName: courseLevels.name,
      programmeName: programmes.name,
    })
    .from(courseLevels)
    .leftJoin(
      programmeLevels,
      eq(programmeLevels.id, courseLevels.programmeLevelId),
    )
    .leftJoin(programmes, eq(programmes.id, programmeLevels.programmeId))
    .orderBy(
      asc(programmes.sortOrder),
      asc(programmeLevels.sortOrder),
      asc(courseLevels.sortOrder),
      asc(courseLevels.levelNumber),
      asc(courseLevels.id),
    );

  return rows.map((row) => ({
    id: row.id,
    name: row.programmeName
      ? `${row.programmeName} — ${row.levelName}`
      : row.levelName,
    levelName: row.levelName,
    programmeName: row.programmeName,
  }));
}
