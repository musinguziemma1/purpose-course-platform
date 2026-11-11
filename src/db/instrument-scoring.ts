import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { instrumentDimensions, instrumentItems, instrumentResponses, instrumentResults, instrumentSessions, instruments } from "@/db/schema";
import { BANDS } from "@/db/instrument-data";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

async function startInstrumentSession(input: {
  instrumentId: number;
  profileId: string;
  version: string;
  consentGiven: boolean;
  sharedWithMentor: boolean;
}, tx: Transaction) {
  const [session] = await tx
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

  return db.transaction(async (tx) => {
    const detail = await getInstrumentById(input.instrumentId, tx);
    if (!detail || detail.instrument.status !== "published") return { error: "Instrument not found." as const };
    if (detail.dimensions.some((dimension) => !detail.items.some((item) => item.dimensionId === dimension.id)) || detail.items.some((item) => !Number.isFinite(item.weight) || item.weight <= 0 || !detail.dimensions.some((dimension) => dimension.id === item.dimensionId))) return { error: "The instrument scoring configuration needs faculty review." as const };

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
    }, tx);

    await tx.insert(instrumentResponses).values(
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

    const [result] = await tx
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
  });
}

export async function getInstrumentById(id: number, database: typeof db | Transaction = db) {
  const rows = await database.select().from(instruments).where(eq(instruments.id, id)).limit(1);
  const instrument = rows[0];
  if (!instrument) return null;
  const dimensions = await database.select().from(instrumentDimensions).where(eq(instrumentDimensions.instrumentId, id)).orderBy(asc(instrumentDimensions.sortOrder));
  const items = await database.select().from(instrumentItems).where(eq(instrumentItems.instrumentId, id)).orderBy(asc(instrumentItems.sortOrder));
  return { instrument, dimensions, items };
}

