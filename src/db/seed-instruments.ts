import { db } from "./index";
import { instrumentBands, instrumentDimensions, instrumentItems, instruments } from "./schema";
import { BANDS, INSTRUMENTS } from "./instrument-data";

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
