import { eq } from "drizzle-orm";
import { db } from "@/db";
import { modulePrinciples, reflectionPrinciples } from "@/db/schema";
import { whenSchemaReady } from "@/db/schema-readiness";
import { isPrincipleKey } from "@/lib/purpose-journey";

/** Sets or clears a module's principle; the module itself is saved even while the tag table is pending. */
export async function setModulePrinciple(moduleId: number, value: unknown) {
  if (!Number.isInteger(moduleId) || moduleId < 1) return;
  await whenSchemaReady("Module principle tags", async () => {
    if (isPrincipleKey(value)) {
      await db.insert(modulePrinciples).values({ moduleId, principle: value })
        .onConflictDoUpdate({ target: modulePrinciples.moduleId, set: { principle: value, updatedAt: new Date() } });
    } else {
      await db.delete(modulePrinciples).where(eq(modulePrinciples.moduleId, moduleId));
    }
  }, undefined);
}

export async function getModulePrinciple(moduleId: number) {
  return whenSchemaReady("Module principle tags", async () => {
    const [row] = await db.select({ principle: modulePrinciples.principle }).from(modulePrinciples).where(eq(modulePrinciples.moduleId, moduleId)).limit(1);
    return row?.principle ?? null;
  }, null);
}

export async function tagReflection(reflectionId: number, value: unknown) {
  if (!isPrincipleKey(value) || !Number.isInteger(reflectionId)) return;
  await whenSchemaReady("Reflection principle tags", async () => {
    await db.insert(reflectionPrinciples).values({ reflectionId, principle: value }).onConflictDoNothing();
  }, undefined);
}
