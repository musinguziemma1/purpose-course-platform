import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  instrumentBands,
  instrumentDimensions,
  instrumentItems,
  instrumentResponses,
  instrumentResults,
  instrumentSessions,
  instruments,
  profiles,
} from "@/db/schema";
import { BANDS, INSTRUMENTS } from "@/db/instrument-data";
import { getSessionUser } from "@/lib/auth";
import { instrumentReadable } from "@/db/learner-access";

/* ------------------------------------------------------------------ *
 * Library and instrument detail
 * ------------------------------------------------------------------ */

export async function getInstrumentLibrary(profileId?: string) {
  const viewer = await getSessionUser();
  if (profileId !== viewer?.profileId) profileId = undefined;
  const rows = await db
    .select({
      instrument: instruments,
      dimensionCount: sql<number>`(select count(*) from ${instrumentDimensions} where ${instrumentDimensions.instrumentId} = ${instruments.id})::int`,
      itemCount: sql<number>`(select count(*) from ${instrumentItems} where ${instrumentItems.instrumentId} = ${instruments.id})::int`,
      latestsScore: profileId
        ? sql<number | null>`(select ${instrumentResults.overallScore} from ${instrumentResults} where ${instrumentResults.instrumentId} = ${instruments.id} and ${instrumentResults.profileId} = ${profileId} order by ${instrumentResults.createdAt} desc limit 1)`
        : sql<number | null>`null`,
      latestBand: profileId
        ? sql<string | null>`(select ${instrumentResults.bandLabel} from ${instrumentResults} where ${instrumentResults.instrumentId} = ${instruments.id} and ${instrumentResults.profileId} = ${profileId} order by ${instrumentResults.createdAt} desc limit 1)`
        : sql<string | null>`null`,
      takenCount: profileId
        ? sql<number>`(select count(*) from ${instrumentResults} where ${instrumentResults.instrumentId} = ${instruments.id} and ${instrumentResults.profileId} = ${profileId})::int`
        : sql<number>`0`,
    })
    .from(instruments)
    .where(eq(instruments.status, "published"))
    .orderBy(asc(instruments.sortOrder));

  return rows;
}

export async function getInstrument(slug: string) {
  const rows = await db.select().from(instruments).where(and(eq(instruments.slug, slug), eq(instruments.status, "published"))).limit(1);
  const instrument = rows[0];
  if (!instrument) return null;

  const [dimensions, items] = await Promise.all([
    db
      .select()
      .from(instrumentDimensions)
      .where(eq(instrumentDimensions.instrumentId, instrument.id))
      .orderBy(asc(instrumentDimensions.sortOrder)),
    db
      .select()
      .from(instrumentItems)
      .where(eq(instrumentItems.instrumentId, instrument.id))
      .orderBy(asc(instrumentItems.sortOrder)),
  ]);

  return {
    instrument,
    dimensions,
    items,
    grouped: dimensions.map((dimension) => ({
      ...dimension,
      items: items.filter((item) => item.dimensionId === dimension.id),
    })),
  };
}

export async function getInstrumentHistory(profileId: string, instrumentId?: number) {
  const conditions = [eq(instrumentResults.profileId, profileId), instrumentReadable(await getSessionUser())];
  if (instrumentId) conditions.push(eq(instrumentResults.instrumentId, instrumentId));
  return db
    .select({
      result: instrumentResults,
      instrumentTitle: instruments.title,
      instrumentSlug: instruments.slug,
      version: instrumentSessions.instrumentVersion,
      sharedWithMentor: instrumentSessions.sharedWithMentor,
    })
    .from(instrumentResults)
    .innerJoin(instruments, eq(instrumentResults.instrumentId, instruments.id))
    .innerJoin(instrumentSessions, eq(instrumentResults.sessionId, instrumentSessions.id))
    .where(and(...conditions))
    .orderBy(desc(instrumentResults.createdAt))
    .limit(30);
}

export async function getResultForReview(sessionId: number) {
  const viewer = await getSessionUser();
  const rows = await db
    .select({
      result: instrumentResults,
      instrument: instruments,
      studentName: profiles.fullName,
      studentId: profiles.id,
      shared: instrumentSessions.sharedWithMentor,
      version: instrumentSessions.instrumentVersion,
    })
    .from(instrumentResults)
    .innerJoin(instruments, eq(instrumentResults.instrumentId, instruments.id))
    .innerJoin(instrumentSessions, eq(instrumentResults.sessionId, instrumentSessions.id))
    .innerJoin(profiles, eq(instrumentResults.profileId, profiles.id))
    .where(and(eq(instrumentResults.sessionId, sessionId), instrumentReadable(viewer)))
    .limit(1);
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export { scoreValue, toPercent, bandFor, submitInstrument, getInstrumentById } from "@/db/instrument-scoring";

/* ------------------------------------------------------------------ *
 * Seeding
 * ------------------------------------------------------------------ */

export async function seedInstruments() {
  let count = 0;
  for (const [index, seed] of INSTRUMENTS.entries()) {
    const [instrument] = await db
      .insert(instruments)
      .values({
        slug: seed.slug,
        title: seed.title,
        category: seed.category,
        construct: seed.construct,
        description: seed.description,
        methodology: seed.methodology,
        limitations: seed.limitations,
        interpretationGuide: seed.interpretationGuide,
        dataProtection: seed.dataProtection,
        consentSummary: seed.consentSummary,
        responseScale: [
          { value: 1, label: "Rarely true" },
          { value: 2, label: "Sometimes true" },
          { value: 3, label: "Often true" },
          { value: 4, label: "Usually true" },
          { value: 5, label: "Consistently true" },
        ],
        version: "1.0",
        isProprietary: true,
        estimatedMinutes: seed.estimatedMinutes,
        status: "published",
        sortOrder: index + 1,
      })
      .onConflictDoNothing()
      .returning({ id: instruments.id });
    if (!instrument) continue;

    let itemOrder = 0;
    for (const [dimensionIndex, dimension] of seed.dimensions.entries()) {
      const [dimensionRow] = await db
        .insert(instrumentDimensions)
        .values({
          instrumentId: instrument.id,
          slug: dimension.slug,
          name: dimension.name,
          description: dimension.description,
          lowLabel: dimension.lowLabel,
          highLabel: dimension.highLabel,
          sortOrder: dimensionIndex + 1,
        })
        .returning({ id: instrumentDimensions.id });

      await db.insert(instrumentItems).values(
        dimension.items.map((entry) => {
          itemOrder += 1;
          return {
            instrumentId: instrument.id,
            dimensionId: dimensionRow.id,
            prompt: entry.prompt,
            reverseScored: entry.reverse ?? false,
            weight: 1,
            sortOrder: itemOrder,
          };
        }),
      );
    }

    await db.insert(instrumentBands).values(
      BANDS.map((band) => ({
        instrumentId: instrument.id,
        dimensionId: null,
        minScore: band.min,
        maxScore: band.max,
        label: band.label,
        interpretation: band.interpretation,
        recommendation: band.recommendation,
        sortOrder: band.sortOrder,
      })),
    );
    count += 1;
  }
  return count;
}
