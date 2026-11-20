"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, programmeLevels, programmeModules, programmes } from "@/db/schema";
import { canAuthorAcademy, getSessionUser } from "@/lib/auth";
import { programmeOutlinePublishError } from "@/lib/programme-publishing";
import { slugify } from "@/lib/utils";

export type ProgrammeActionState = { ok?: boolean; error?: string; message?: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function positiveId(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function requireAuthor() {
  const user = await getSessionUser();
  return user && canAuthorAcademy(user) ? user : null;
}

async function logProgrammeAction(actorId: string | undefined, action: string, description: string, programmeId: number) {
  await db.insert(activityLogs).values({
    actorId: actorId ?? null,
    action,
    entityType: "academy",
    entityId: String(programmeId),
    description,
  });
}

function refreshProgramme(programmeId: number) {
  revalidatePath("/admin/academy");
  revalidatePath(`/admin/academy/programmes/${programmeId}`);
  revalidatePath("/course");
}

export async function saveProgramme(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const intent = text(formData, "intent");
  const name = text(formData, "name");
  const duration = text(formData, "duration");
  const structure = text(formData, "structure");
  const description = text(formData, "description");

  if (!programmeId) return { error: "Programme not found." };
  if (intent !== "draft" && intent !== "publish") return { error: "Choose whether to save a draft or publish." };
  if (name.length < 3 || name.length > 200) return { error: "Programme name must be between 3 and 200 characters." };
  if (!duration || duration.length > 80) return { error: "Programme duration is required and must be at most 80 characters." };
  if (!structure || structure.length > 180) return { error: "Programme structure is required and must be at most 180 characters." };
  if (description.length < 20 || description.length > 5000) return { error: "Programme description must be between 20 and 5,000 characters." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    if (intent === "publish") {
      const levels = await tx
        .select({ id: programmeLevels.id, name: programmeLevels.name })
        .from(programmeLevels)
        .where(eq(programmeLevels.programmeId, programmeId));
      const modules = levels.length
        ? await tx
            .select({ programmeLevelId: programmeModules.programmeLevelId, title: programmeModules.title })
            .from(programmeModules)
            .where(inArray(programmeModules.programmeLevelId, levels.map((level) => level.id)))
        : [];
      const outlineError = programmeOutlinePublishError(
        levels.map((level) => ({
          name: level.name,
          modules: modules.filter((module) => module.programmeLevelId === level.id),
        })),
      );
      if (outlineError) return { error: outlineError };
    }

    await tx
      .update(programmes)
      .set({
        name,
        duration,
        structure,
        description,
        status: intent === "publish" ? "published" : "draft",
        updatedAt: new Date(),
      })
      .where(eq(programmes.id, programmeId));
    return { status: intent };
  });

  if ("error" in result) return result;
  await logProgrammeAction(
    author.profileId,
    result.status === "publish" ? "academy.programme_published" : "academy.programme_saved",
    `${result.status === "publish" ? "Published" : "Saved"} the programme outline “${name}”.`,
    programmeId,
  );
  refreshProgramme(programmeId);
  return {
    ok: true,
    message:
      result.status === "publish"
        ? "Programme outline published to the public catalogue. This does not publish digital lessons."
        : "Programme outline saved as a draft.",
  };
}

export async function updateProgrammeLevel(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const levelId = positiveId(formData, "levelId");
  const name = text(formData, "name");
  if (!programmeId || !levelId) return { error: "Programme level not found." };
  if (name.length < 3 || name.length > 200) return { error: "Level name must be between 3 and 200 characters." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    const [level] = await tx
      .select({ id: programmeLevels.id })
      .from(programmeLevels)
      .where(and(eq(programmeLevels.id, levelId), eq(programmeLevels.programmeId, programmeId)))
      .limit(1);
    if (!level) return { error: "Programme level not found." };

    await tx.update(programmeLevels).set({ name }).where(eq(programmeLevels.id, levelId));
    await tx.update(programmes).set({ status: "draft", updatedAt: new Date() }).where(eq(programmes.id, programmeId));
    return { ok: true };
  });

  if ("error" in result) return result;
  await logProgrammeAction(author.profileId, "academy.programme_level_updated", `Updated a level in programme #${programmeId}.`, programmeId);
  refreshProgramme(programmeId);
  return { ok: true, message: "Level saved. The programme is a draft until published again." };
}

export async function createProgrammeLevel(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const name = text(formData, "name");
  if (!programmeId) return { error: "Programme not found." };
  if (name.length < 3 || name.length > 200) return { error: "Level name must be between 3 and 200 characters." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    const [orderRow] = await tx
      .select({ value: max(programmeLevels.sortOrder) })
      .from(programmeLevels)
      .where(eq(programmeLevels.programmeId, programmeId));
    const slug = `${slugify(name).slice(0, 59) || "level"}-${randomUUID()}`;
    await tx.insert(programmeLevels).values({
      programmeId,
      slug,
      name,
      sortOrder: Number(orderRow?.value ?? 0) + 1,
    });
    await tx.update(programmes).set({ status: "draft", updatedAt: new Date() }).where(eq(programmes.id, programmeId));
    return { ok: true };
  });

  if ("error" in result) return result;
  await logProgrammeAction(author.profileId, "academy.programme_level_created", `Added a level to programme #${programmeId}.`, programmeId);
  refreshProgramme(programmeId);
  return { ok: true, message: "Level added. Add at least one module before publishing." };
}

export async function deleteProgrammeLevel(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const levelId = positiveId(formData, "levelId");
  if (!programmeId || !levelId) return { error: "Programme level not found." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    const [level] = await tx
      .select({ id: programmeLevels.id })
      .from(programmeLevels)
      .where(and(eq(programmeLevels.id, levelId), eq(programmeLevels.programmeId, programmeId)))
      .limit(1);
    if (!level) return { error: "Programme level not found." };

    await tx.delete(programmeLevels).where(eq(programmeLevels.id, levelId));
    await tx.update(programmes).set({ status: "draft", updatedAt: new Date() }).where(eq(programmes.id, programmeId));
    return { ok: true };
  });

  if ("error" in result) return result;
  await logProgrammeAction(author.profileId, "academy.programme_level_deleted", `Removed a level from programme #${programmeId}.`, programmeId);
  refreshProgramme(programmeId);
  return { ok: true, message: "Level and its outline modules removed. The programme remains a draft." };
}

export async function updateProgrammeModule(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const levelId = positiveId(formData, "levelId");
  const moduleId = positiveId(formData, "moduleId");
  const title = text(formData, "title");
  if (!programmeId || !levelId || !moduleId) return { error: "Programme module not found." };
  if (title.length < 3 || title.length > 220) return { error: "Module title must be between 3 and 220 characters." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    const [module] = await tx
      .select({ id: programmeModules.id })
      .from(programmeModules)
      .innerJoin(programmeLevels, eq(programmeModules.programmeLevelId, programmeLevels.id))
      .where(
        and(
          eq(programmeModules.id, moduleId),
          eq(programmeLevels.id, levelId),
          eq(programmeLevels.programmeId, programmeId),
        ),
      )
      .limit(1);
    if (!module) return { error: "Programme module not found." };

    await tx.update(programmeModules).set({ title }).where(eq(programmeModules.id, moduleId));
    await tx.update(programmes).set({ status: "draft", updatedAt: new Date() }).where(eq(programmes.id, programmeId));
    return { ok: true };
  });

  if ("error" in result) return result;
  await logProgrammeAction(author.profileId, "academy.programme_module_updated", `Updated a module in programme #${programmeId}.`, programmeId);
  refreshProgramme(programmeId);
  return { ok: true, message: "Module saved. The programme is a draft until published again." };
}

export async function createProgrammeModule(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const levelId = positiveId(formData, "levelId");
  const title = text(formData, "title");
  if (!programmeId || !levelId) return { error: "Programme level not found." };
  if (title.length < 3 || title.length > 220) return { error: "Module title must be between 3 and 220 characters." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    const [level] = await tx
      .select({ id: programmeLevels.id })
      .from(programmeLevels)
      .where(and(eq(programmeLevels.id, levelId), eq(programmeLevels.programmeId, programmeId)))
      .limit(1);
    if (!level) return { error: "Programme level not found." };

    const [orderRow] = await tx
      .select({ value: max(programmeModules.sortOrder) })
      .from(programmeModules)
      .where(eq(programmeModules.programmeLevelId, levelId));
    const slug = `${slugify(title).slice(0, 59) || "module"}-${randomUUID()}`;
    await tx.insert(programmeModules).values({
      programmeLevelId: levelId,
      slug,
      title,
      sortOrder: Number(orderRow?.value ?? 0) + 1,
    });
    await tx.update(programmes).set({ status: "draft", updatedAt: new Date() }).where(eq(programmes.id, programmeId));
    return { ok: true };
  });

  if ("error" in result) return result;
  await logProgrammeAction(author.profileId, "academy.programme_module_created", `Added a module to programme #${programmeId}.`, programmeId);
  refreshProgramme(programmeId);
  return { ok: true, message: "Module added. The programme is a draft until published again." };
}

export async function deleteProgrammeModule(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const levelId = positiveId(formData, "levelId");
  const moduleId = positiveId(formData, "moduleId");
  if (!programmeId || !levelId || !moduleId) return { error: "Programme module not found." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    const [module] = await tx
      .select({ id: programmeModules.id })
      .from(programmeModules)
      .innerJoin(programmeLevels, eq(programmeModules.programmeLevelId, programmeLevels.id))
      .where(
        and(
          eq(programmeModules.id, moduleId),
          eq(programmeLevels.id, levelId),
          eq(programmeLevels.programmeId, programmeId),
        ),
      )
      .limit(1);
    if (!module) return { error: "Programme module not found." };

    await tx.delete(programmeModules).where(eq(programmeModules.id, moduleId));
    await tx.update(programmes).set({ status: "draft", updatedAt: new Date() }).where(eq(programmes.id, programmeId));
    return { ok: true };
  });

  if ("error" in result) return result;
  await logProgrammeAction(author.profileId, "academy.programme_module_deleted", `Removed a module from programme #${programmeId}.`, programmeId);
  refreshProgramme(programmeId);
  return { ok: true, message: "Module removed. The programme remains a draft." };
}

export async function moveProgrammeItem(
  _previousState: ProgrammeActionState,
  formData: FormData,
): Promise<ProgrammeActionState> {
  const author = await requireAuthor();
  if (!author) return { error: "Academy author access required." };

  const programmeId = positiveId(formData, "programmeId");
  const itemId = positiveId(formData, "itemId");
  const itemType = text(formData, "itemType");
  const direction = text(formData, "direction");
  const levelId = positiveId(formData, "levelId");
  if (!programmeId || !itemId) return { error: "Programme outline item not found." };
  if (itemType !== "level" && itemType !== "module") return { error: "Choose a valid outline item." };
  if (direction !== "up" && direction !== "down") return { error: "Choose a valid direction." };

  const result = await db.transaction(async (tx) => {
    const [programme] = await tx
      .select({ id: programmes.id })
      .from(programmes)
      .where(eq(programmes.id, programmeId))
      .for("update")
      .limit(1);
    if (!programme) return { error: "Programme not found." };

    if (itemType === "level") {
      const levels = await tx
        .select({ id: programmeLevels.id, sortOrder: programmeLevels.sortOrder })
        .from(programmeLevels)
        .where(eq(programmeLevels.programmeId, programmeId))
        .orderBy(asc(programmeLevels.sortOrder), asc(programmeLevels.id));
      const index = levels.findIndex((level) => level.id === itemId);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0) return { error: "Programme level not found." };
      if (swapIndex < 0 || swapIndex >= levels.length) return { error: "That level is already at the edge of the outline." };
      await tx.update(programmeLevels).set({ sortOrder: levels[swapIndex].sortOrder }).where(eq(programmeLevels.id, itemId));
      await tx.update(programmeLevels).set({ sortOrder: levels[index].sortOrder }).where(eq(programmeLevels.id, levels[swapIndex].id));
    } else {
      if (!levelId) return { error: "Programme level not found." };
      const [level] = await tx
        .select({ id: programmeLevels.id })
        .from(programmeLevels)
        .where(and(eq(programmeLevels.id, levelId), eq(programmeLevels.programmeId, programmeId)))
        .limit(1);
      if (!level) return { error: "Programme level not found." };
      const modules = await tx
        .select({ id: programmeModules.id, sortOrder: programmeModules.sortOrder })
        .from(programmeModules)
        .where(eq(programmeModules.programmeLevelId, levelId))
        .orderBy(asc(programmeModules.sortOrder), asc(programmeModules.id));
      const index = modules.findIndex((module) => module.id === itemId);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0) return { error: "Programme module not found." };
      if (swapIndex < 0 || swapIndex >= modules.length) return { error: "That module is already at the edge of the outline." };
      await tx.update(programmeModules).set({ sortOrder: modules[swapIndex].sortOrder }).where(eq(programmeModules.id, itemId));
      await tx.update(programmeModules).set({ sortOrder: modules[index].sortOrder }).where(eq(programmeModules.id, modules[swapIndex].id));
    }

    await tx.update(programmes).set({ status: "draft", updatedAt: new Date() }).where(eq(programmes.id, programmeId));
    return { ok: true };
  });

  if ("error" in result) return result;
  await logProgrammeAction(author.profileId, "academy.programme_outline_reordered", `Reordered an item in programme #${programmeId}.`, programmeId);
  refreshProgramme(programmeId);
  return { ok: true, message: "Outline order saved. The programme is a draft until published again." };
}
