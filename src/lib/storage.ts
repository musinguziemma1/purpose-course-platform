import { createClient } from "@supabase/supabase-js";
import {
  MEDIA_MAX_BYTES,
  MEDIA_TYPES,
  fileSignatureMatches,
} from "@/lib/media-files";

export const MEDIA_BUCKET = "purpose-course-media";

function storage() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Media storage needs the project's server-only Supabase storage key.",
    );
  const endpoint = new URL(url),
    database = process.env.DATABASE_URL
      ? new URL(process.env.DATABASE_URL)
      : null;
  if (
    endpoint.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(endpoint.hostname)
  )
    throw new Error("Storage requires a secure Supabase endpoint.");
  if (database?.hostname.endsWith(".pooler.supabase.com")) {
    const project = decodeURIComponent(database.username).split(".").at(-1);
    if (
      ![`${project}.supabase.co`, `${project}.storage.supabase.co`].includes(
        endpoint.hostname,
      )
    )
      throw new Error(
        "Storage must use the same Supabase project as the application database.",
      );
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }).storage;
}

export async function ensureMediaBucket() {
  const client = storage(),
    existing = await client.getBucket(MEDIA_BUCKET);
  if (existing.data) {
    if (existing.data.public)
      throw new Error("The media bucket must be private.");
    return;
  }
  if (
    existing.error &&
    !["404", "400"].includes(String(existing.error.statusCode))
  )
    throw new Error(
      "Media storage is unavailable. Check its server configuration.",
    );
  const result = await client.createBucket(MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: MEDIA_MAX_BYTES,
    allowedMimeTypes: [
      ...new Set(Object.values(MEDIA_TYPES).map((type) => type.mime)),
    ],
  });
  if (result.error && !/already exists|duplicate/i.test(result.error.message))
    throw new Error("The private media bucket could not be prepared.");
}

export async function createMediaUpload(path: string) {
  await ensureMediaBucket();
  const { data, error } = await storage()
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data)
    throw new Error("An upload could not be authorized. Try again later.");
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!publicKey)
    throw new Error("The public Supabase upload key is not configured.");
  if (!publicKey.startsWith("sb_publishable_")) {
    try {
      if (
        JSON.parse(Buffer.from(publicKey.split(".")[1], "base64url").toString())
          .role !== "anon"
      )
        throw new Error("not-public");
    } catch {
      throw new Error(
        "Configure a public Supabase publishable or anon key for uploads.",
      );
    }
  }
  return { signedUrl: data.signedUrl, publicKey };
}

export async function signedMediaUrl(path: string, downloadName?: string) {
  const { data, error } = await storage()
    .from(MEDIA_BUCKET)
    .createSignedUrl(
      path,
      60,
      downloadName ? { download: downloadName } : undefined,
    );
  if (error || !data) throw new Error("The file is temporarily unavailable.");
  return data.signedUrl;
}

export async function verifyMediaObject(
  path: string,
  name: string,
  byteSize: number,
  mimeType: string,
) {
  const folder = path.slice(0, path.lastIndexOf("/")),
    leaf = path.slice(path.lastIndexOf("/") + 1);
  const { data, error } = await storage()
    .from(MEDIA_BUCKET)
    .list(folder, { search: leaf, limit: 2 });
  const file = data?.find((item) => item.name === leaf);
  if (
    error ||
    !file ||
    Number(file.metadata?.size) !== byteSize ||
    String(file.metadata?.mimetype ?? "").split(";")[0] !== mimeType
  )
    return false;
  const response = await fetch(await signedMediaUrl(path), {
    headers: { Range: "bytes=0-511" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok || !response.body) return false;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (length < 512) {
      const part = await reader.read();
      if (part.done) break;
      chunks.push(part.value);
      length += part.value.length;
    }
  } finally {
    await reader.cancel();
  }
  return fileSignatureMatches(name, Buffer.concat(chunks).subarray(0, 512));
}

export async function removeFailedMediaObject(path: string) {
  const result = await storage().from(MEDIA_BUCKET).remove([path]);
  if (result.error)
    throw new Error(
      "The rejected upload could not be removed. Contact your administrator.",
    );
}
