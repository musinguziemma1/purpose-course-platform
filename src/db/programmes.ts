import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { programmeLevels, programmeModules, programmes } from "@/db/schema";

export async function getProgrammeOutlines(options: { includeDrafts?: boolean } = {}) {
  const { includeDrafts = true } = options;
  const [programmeRows, levelRows, moduleRows] = await Promise.all([
    db
      .select()
      .from(programmes)
      .where(includeDrafts ? undefined : eq(programmes.status, "published"))
      .orderBy(asc(programmes.sortOrder), asc(programmes.id)),
    db.select().from(programmeLevels).orderBy(asc(programmeLevels.sortOrder), asc(programmeLevels.id)),
    db.select().from(programmeModules).orderBy(asc(programmeModules.sortOrder), asc(programmeModules.id)),
  ]);

  return programmeRows.map((programme) => ({
    ...programme,
    levels: levelRows
      .filter((level) => level.programmeId === programme.id)
      .map((level) => ({
        ...level,
        modules: moduleRows.filter((module) => module.programmeLevelId === level.id),
      })),
  }));
}
