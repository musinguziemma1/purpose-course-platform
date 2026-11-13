import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  articles,
  assignments,
  assignmentSubmissions,
  courseModules,
  courses,
  lessons,
  mediaAssets,
  profiles,
  resources,
} from "@/db/schema";
import { currentActor } from "@/db/actor";
import { assignmentReadable } from "@/db/assignment-workflow";
import { learnerReadable } from "@/db/learner-access";
import { lessonAccessible } from "@/db/learning-access";
import {
  canUseMediaLibrary,
  mediaFileError,
  MEDIA_TYPES,
} from "@/lib/media-files";
import { isUuid } from "@/lib/contact";
import {
  MEDIA_BUCKET,
  createMediaUpload,
  removeFailedMediaObject,
  signedMediaUrl,
  verifyMediaObject,
} from "@/lib/storage";
import type { SessionUser } from "@/lib/auth";

export async function listLibraryAssets(
  viewer: SessionUser | null,
  query = "",
  offset = 0,
  kind = "",
) {
  if (!canUseMediaLibrary(viewer)) return null;
  return db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (!canUseMediaLibrary(actor)) return null;
    return tx
      .select({
        id: mediaAssets.id,
        url: mediaAssets.url,
        name: mediaAssets.fileName,
        alt: mediaAssets.alt,
        kind: mediaAssets.kind,
        mimeType: mediaAssets.mimeType,
        byteSize: mediaAssets.byteSize,
        uploadedBy: mediaAssets.uploadedBy,
        createdAt: mediaAssets.createdAt,
      })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.purpose, "library"),
          eq(mediaAssets.state, "ready"),
          ["image", "video", "audio", "document"].includes(kind)
            ? eq(mediaAssets.kind, kind)
            : undefined,
          query
            ? or(
                ilike(mediaAssets.fileName, `%${query.slice(0, 100)}%`),
                ilike(mediaAssets.alt, `%${query.slice(0, 100)}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id))
      .limit(40)
      .offset(Math.max(0, Math.min(offset, 10000)));
  });
}

export async function beginMediaUpload(
  input: { name: string; byteSize: number; purpose: string },
  viewer: SessionUser | null,
) {
  const invalid = mediaFileError(input.name, input.byteSize);
  if (invalid) return { error: invalid };
  if (!["library", "submission"].includes(input.purpose))
    return { error: "Choose a valid upload destination." };
  const type = MEDIA_TYPES[input.name.toLowerCase().split(".").at(-1)!],
    id = randomUUID();
  const reserved = await db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (
      !actor ||
      (input.purpose === "library"
        ? !canUseMediaLibrary(actor)
        : actor.roleSlug !== "student")
    )
      return null;
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${actor.profileId}, 8550))`,
    );
    const [recent] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.uploadedBy, actor.profileId),
          sql`${mediaAssets.createdAt} > clock_timestamp() - interval '1 hour'`,
        ),
      );
    if (recent.count >= 100) return null;
    const path = `${input.purpose}/${actor.profileId}/${id}.${input.name.toLowerCase().split(".").at(-1)}`;
    await tx
      .insert(mediaAssets)
      .values({
        id,
        url: `/api/media/${id}`,
        fileName: input.name,
        mimeType: type.mime,
        byteSize: input.byteSize,
        kind: type.kind,
        uploadedBy: actor.profileId,
        purpose: input.purpose,
        state: "pending",
        storageBucket: MEDIA_BUCKET,
        storagePath: path,
      });
    return path;
  });
  if (!reserved)
    return {
      error:
        "Upload access is unavailable or the hourly upload limit has been reached.",
    };
  try {
    return {
      ok: true,
      id,
      url: `/api/media/${id}`,
      mimeType: type.mime,
      ...(await createMediaUpload(reserved)),
    };
  } catch (error) {
    await db
      .update(mediaAssets)
      .set({ state: "failed" })
      .where(eq(mediaAssets.id, id));
    return {
      error:
        error instanceof Error
          ? error.message
          : "Storage is temporarily unavailable.",
    };
  }
}

export async function completeMediaUpload(
  id: string,
  viewer: SessionUser | null,
) {
  if (!isUuid(id) || !viewer || viewer.isDemo)
    return { error: "Upload not found." };
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(
      and(eq(mediaAssets.id, id), eq(mediaAssets.uploadedBy, viewer.profileId)),
    )
    .limit(1);
  if (
    !asset ||
    asset.storageBucket !== MEDIA_BUCKET ||
    !asset.storagePath ||
    !asset.fileName ||
    !asset.byteSize ||
    !asset.mimeType
  )
    return { error: "Upload not found." };
  if (asset.purpose === "library" && !canUseMediaLibrary(viewer))
    return { error: "Media library access required." };
  if (asset.state === "ready")
    return {
      ok: true,
      id,
      url: asset.url,
      name: asset.fileName,
      kind: asset.kind,
    };
  if (asset.state !== "pending")
    return { error: "Start a new upload for this file." };
  if (
    !(await verifyMediaObject(
      asset.storagePath,
      asset.fileName,
      asset.byteSize,
      asset.mimeType,
    ))
  ) {
    await removeFailedMediaObject(asset.storagePath);
    await db
      .update(mediaAssets)
      .set({ state: "failed" })
      .where(eq(mediaAssets.id, id));
    return {
      error:
        "The uploaded file does not match its declared format or size. Choose the original file and try again.",
    };
  }
  return db.transaction(async (tx) => {
    const actor = await currentActor(tx, viewer);
    if (
      !actor ||
      (asset.purpose === "library"
        ? !canUseMediaLibrary(actor)
        : actor.roleSlug !== "student")
    )
      return { error: "Upload permission has changed. Sign in again." };
    await tx
      .update(mediaAssets)
      .set({ state: "ready" })
      .where(
        and(
          eq(mediaAssets.id, id),
          eq(mediaAssets.uploadedBy, actor.profileId),
          eq(mediaAssets.state, "pending"),
        ),
      );
    return {
      ok: true,
      id,
      url: asset.url,
      name: asset.fileName,
      kind: asset.kind,
    };
  });
}

export async function readableMedia(
  id: string,
  viewer: SessionUser | null,
  download = false,
) {
  if (!isUuid(id)) return null;
  if (viewer) viewer = await db.transaction((tx) => currentActor(tx, viewer));
  const [asset] = await db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.id, id), eq(mediaAssets.state, "ready")))
    .limit(1);
  if (!asset) return null;
  let allowed = asset.purpose === "library" && canUseMediaLibrary(viewer);
  if (asset.purpose === "submission") {
    allowed = Boolean(viewer && asset.uploadedBy === viewer.profileId);
    if (!allowed && viewer) {
      const [submission] = await db
        .select({ id: assignmentSubmissions.id })
        .from(assignmentSubmissions)
        .where(
          and(
            eq(assignmentSubmissions.attachmentId, id),
            inArray(assignmentSubmissions.status, ["submitted", "reviewed"]),
            learnerReadable(assignmentSubmissions.profileId, viewer),
          ),
        )
        .limit(1);
      allowed = Boolean(submission);
    }
  } else if (!allowed) {
    const [publicArticle, publicResource, publicCourse, avatar] =
      await Promise.all([
        db
          .select({ id: articles.id })
          .from(articles)
          .where(
            and(
              eq(articles.status, "published"),
              or(
                eq(articles.coverImageUrl, asset.url),
                sql`position(${asset.url} in ${articles.body}) > 0`,
              ),
            ),
          )
          .limit(1),
        db
          .select({ id: resources.id })
          .from(resources)
          .where(eq(resources.fileUrl, asset.url))
          .limit(1),
        db
          .select({ id: courses.id })
          .from(courses)
          .where(
            and(
              eq(courses.status, "published"),
              eq(courses.coverImageUrl, asset.url),
            ),
          )
          .limit(1),
        asset.kind === "image"
          ? db
              .select({ id: profiles.id })
              .from(profiles)
              .where(eq(profiles.avatarUrl, asset.url))
              .limit(1)
          : [],
      ]);
    allowed = Boolean(
      publicArticle.length ||
        publicResource.length ||
        publicCourse.length ||
        avatar.length,
    );
    if (!allowed && viewer) {
      const [lesson, assignment] = await Promise.all([
        db
          .select({ id: lessons.id })
          .from(lessons)
          .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
          .innerJoin(courses, eq(courseModules.courseId, courses.id))
          .where(
            and(
              or(
                eq(lessons.videoUrl, asset.url),
                eq(lessons.audioUrl, asset.url),
                eq(lessons.imageUrl, asset.url),
                eq(lessons.downloadUrl, asset.url),
              ),
              lessonAccessible(viewer),
            ),
          )
          .limit(1),
        viewer.roleSlug === "student"
          ? db
              .select({ id: assignments.id })
              .from(assignments)
              .where(
                and(
                  eq(assignments.attachmentId, id),
                  assignmentReadable(viewer),
                ),
              )
              .limit(1)
          : [],
      ]);
      allowed = Boolean(lesson.length || assignment.length);
    }
  }
  if (!allowed) return null;
  if (!asset.storagePath)
    return /^\/images\/|^\/resources\/|^https:\/\//.test(asset.url)
      ? asset.url
      : null;
  if (asset.storageBucket !== MEDIA_BUCKET) return null;
  return signedMediaUrl(
    asset.storagePath,
    download || asset.kind === "document"
      ? (asset.fileName ?? "download")
      : undefined,
  );
}
