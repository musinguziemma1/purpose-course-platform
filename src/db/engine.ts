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

export function scoreValue(raw: number, reverse: boolean) {
  return reverse ? 6 - raw : raw;
}

export function toPercent(mean: number) {
  return Math.round(((mean - 1) / 4) * 100);
}

export function bandFor(score: number) {
  return BANDS.find((band) => score >= band.min && score <= band.max) ?? BANDS[0];
}

export type ScoredResponse = { itemId: number; rawValue: number };

export async function startInstrumentSession(input: {
  instrumentId: number;
  profileId: string;
  version: string;
  consentGiven: boolean;
  sharedWithMentor: boolean;
}) {
  const [session] = await db
    .insert(instrumentSessions)
    .values({
      instrumentId: input.instrumentId,
      profileId: input.profileId,
      instrumentVersion: input.version,
      consentGiven: input.consentGiven,
      sharedWithMentor: input.sharedWithMentor,
      status: "completed",
      completedAt: new Date(),
    })
    .returning();
  return session;
}

export async function submitInstrument(input: {
  instrumentId: number;
  profileId: string;
  consentGiven: boolean;
  sharedWithMentor: boolean;
  responses: ScoredResponse[];
}) {
  if (!input.consentGiven) return { error: "Consent is required before results can be stored." as const };

  const detail = await getInstrumentById(input.instrumentId);
  if (!detail || detail.instrument.status !== "published") return { error: "Instrument not found." as const };

  const answered = new Map(input.responses.map((response) => [response.itemId, response.rawValue]));
  if (!detail.items.length || !detail.dimensions.length || answered.size !== input.responses.length || input.responses.length !== detail.items.length || input.responses.some((response) => !Number.isInteger(response.rawValue) || response.rawValue < 1 || response.rawValue > 5)) return { error: "Choose one valid response for every statement." as const };
  const missing = detail.items.filter((item) => {
    const value = answered.get(item.id);
    return value === undefined || value < 1 || value > 5;
  });
  if (missing.length > 0) {
    return { error: `Answer every statement before submitting (${missing.length} remaining).` as const };
  }

  const session = await startInstrumentSession({
    instrumentId: detail.instrument.id,
    profileId: input.profileId,
    version: detail.instrument.version,
    consentGiven: input.consentGiven,
    sharedWithMentor: input.sharedWithMentor,
  });

  await db.insert(instrumentResponses).values(
    detail.items.map((item) => ({
      sessionId: session.id,
      itemId: item.id,
      rawValue: answered.get(item.id) as number,
      scoredValue: scoreValue(answered.get(item.id) as number, item.reverseScored),
    })),
  );

  const dimensions = detail.dimensions.map((dimension) => {
    const items = detail.items.filter((item) => item.dimensionId === dimension.id);
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0) || 1;
    const weighted = items.reduce(
      (sum, item) => sum + scoreValue(answered.get(item.id) as number, item.reverseScored) * item.weight,
      0,
    );
    const mean = weighted / totalWeight;
    const score = toPercent(mean);
    const band = bandFor(score);
    return {
      slug: dimension.slug,
      name: dimension.name,
      score,
      bandLabel: band.label,
      interpretation: `${score}% places this between “${dimension.lowLabel}” and “${dimension.highLabel}”. ${band.interpretation}`,
      recommendation: band.recommendation,
      lowLabel: dimension.lowLabel,
      highLabel: dimension.highLabel,
    };
  });

  const overallScore = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length);
  const overallBand = bandFor(overallScore);
  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0];
  const strongest = [...dimensions].sort((a, b) => b.score - a.score)[0];

  const summary = `Your overall ${detail.instrument.title} score is ${overallScore} (${overallBand.label}). ${overallBand.interpretation} Your strongest domain is ${strongest.name} (${strongest.score}) and the domain most worth attention is ${weakest.name} (${weakest.score}). ${detail.instrument.limitations}`;

  const recommendations = [
    ...new Set([weakest.recommendation, strongest.recommendation, overallBand.recommendation]),
  ];
  if (weakest.slug === strongest.slug) {
    recommendations.push("Pick one domain and one practice, and bring it to your next coaching conversation.");
  }

  const scoringTrace = {
    method: detail.instrument.scoringMethod,
    scale: detail.instrument.responseScale,
    formula: "percent = ((mean of scored responses − 1) ÷ 4) × 100, weighted by item weight; reverse-scored items use (6 − raw).",
    bands: BANDS,
    itemCount: detail.items.length,
    reverseScoredItems: detail.items.filter((item) => item.reverseScored).length,
    dimensionTrace: dimensions.map((dimension) => {
      const items = detail.items.filter((item) => item.dimensionId === detail.dimensions.find((d) => d.slug === dimension.slug)?.id);
      return {
        dimension: dimension.slug,
        items: items.map((item) => ({
          itemId: item.id,
          raw: answered.get(item.id),
          scored: scoreValue(answered.get(item.id) as number, item.reverseScored),
          reverse: item.reverseScored,
          weight: item.weight,
        })),
      };
    }),
    version: detail.instrument.version,
    scoredAt: new Date().toISOString(),
  };

  const [result] = await db
    .insert(instrumentResults)
    .values({
      sessionId: session.id,
      instrumentId: detail.instrument.id,
      profileId: input.profileId,
      overallScore,
      bandLabel: overallBand.label,
      summary,
      dimensions,
      recommendations,
      scoringTrace,
    })
    .returning();

  return {
    ok: true as const,
    result,
    session,
    instrument: detail.instrument,
    dimensions,
    overallBand,
    weakest,
    strongest,
  };
}

export async function getInstrumentById(id: number) {
  const rows = await db.select().from(instruments).where(eq(instruments.id, id)).limit(1);
  const instrument = rows[0];
  if (!instrument) return null;
  const [dimensions, items] = await Promise.all([
    db.select().from(instrumentDimensions).where(eq(instrumentDimensions.instrumentId, id)).orderBy(asc(instrumentDimensions.sortOrder)),
    db.select().from(instrumentItems).where(eq(instrumentItems.instrumentId, id)).orderBy(asc(instrumentItems.sortOrder)),
  ]);
  return { instrument, dimensions, items };
}

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
