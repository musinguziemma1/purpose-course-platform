"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { saveArticle, type ActionState } from "@/app/actions/publishing";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";

type Option = { id: number; name: string };
type AuthorOption = { id: string; fullName: string };

const IMAGE_PRESETS = [
  ["Identity", "/images/journal-identity.jpg"],
  ["Purpose", "/images/journal-purpose.jpg"],
  ["Workshop", "/images/hero-workshop.jpg"],
  ["Round table", "/images/community.jpg"],
  ["Mentorship", "/images/mentorship.jpg"],
  ["Summit", "/images/level-advanced.jpg"],
  ["Study", "/images/student-study.jpg"],
];

export function ArticleForm({
  article,
  categories,
  authors,
  canReview,
  currentUserId,
}: {
  article?: {
    id: string;
    title: string;
    subtitle: string | null;
    excerpt: string | null;
    body: string;
    categoryId: number | null;
    authorId: string;
    coverImageUrl: string | null;
    coverAlt: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    isFeatured: boolean;
    tags: { name: string }[];
    updatedAt: Date | string;
  };
  categories: Option[];
  authors: AuthorOption[];
  canReview: boolean;
  currentUserId: string;
}) {
  const [version, setVersion] = useState(() => article ? new Date(article.updatedAt).toISOString() : "");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (previous, form) => {
    const result = await saveArticle(previous, form);
    if (result.ok && result.updatedAt) setVersion(result.updatedAt);
    return result;
  }, {});

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={pending} className="min-w-0 space-y-5">
      {article ? <input type="hidden" name="id" value={article.id} /> : null}
      <input type="hidden" name="expectedVersion" value={version} />

      <div className="rounded-xl border border-navy/10 bg-paper p-5">
        <div className="grid gap-4">
          <Field label="Title" hint="required">
            <Input name="title" required defaultValue={article?.title} placeholder="A working title" className="font-serif text-lg" />
          </Field>
          <Field label="Standfirst" hint="optional">
            <Input name="subtitle" defaultValue={article?.subtitle ?? ""} placeholder="One line that frames the article" />
          </Field>
          <Field label="Excerpt" hint="shown on cards and in search">
            <Textarea name="excerpt" rows={3} defaultValue={article?.excerpt ?? ""} placeholder="Two or three sentences." />
          </Field>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border border-navy/10 bg-paper p-5">
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="article-body" hint="markdown-ish">Body</Label>
            <span className="text-[10.5px] text-stone-400">## heading · **bold** · &gt; quote · - list · :::callout</span>
          </div>
          <Textarea
            id="article-body"
            name="body"
            required
            rows={24}
            defaultValue={article?.body}
            placeholder="Write the article. Aim for clarity, one idea per paragraph, and a concrete practice at the end."
            className="font-sans text-[13.5px] leading-relaxed"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-navy/10 bg-paper p-5">
            <div className="grid gap-3">
              <Field label="Principle category">
                <Select name="categoryId" defaultValue={article?.categoryId ?? categories[0]?.id ?? ""}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {canReview ? (
                <Field label="Author">
                  <Select name="authorId" defaultValue={article?.authorId ?? currentUserId}>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.fullName}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              <Field label="Tags" hint="comma separated, max 8">
                <Input name="tags" defaultValue={article?.tags.map((tag) => tag.name).join(", ")} placeholder="identity, calling, work" />
              </Field>
              <Field label="Change note" hint="appears in revision history">
                <Input name="changeNote" placeholder="Tightened the introduction" />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-navy/10 bg-paper p-5">
            <Label htmlFor="article-cover-image" hint="URL">Cover image</Label>
            <Input
              id="article-cover-image"
              name="coverImageUrl"
              defaultValue={article?.coverImageUrl ?? ""}
              placeholder="https://…"
              className="text-[12px]"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IMAGE_PRESETS.map(([label, url]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('input[name="coverImageUrl"]');
                    if (input) input.value = url;
                  }}
                  className="inline-flex items-center gap-1 overflow-hidden rounded-full border border-navy/12 text-[10px] text-stone-600 transition-colors hover:border-gold hover:text-navy"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-5 w-7 object-cover" />
                  <span className="pr-2">{label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-stone-500">
              Click a preset to insert the brand image, or paste any URL (Cloudinary, your own CDN).
            </p>
            <div className="mt-3">
              <Field label="Cover alt text">
                <Input name="coverAlt" defaultValue={article?.coverAlt ?? ""} placeholder="Describe the image" className="text-[12px]" />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-navy/10 bg-paper p-5">
            <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-stone-500">SEO</p>
            <div className="grid gap-3">
              <Field label="SEO title">
                <Input name="seoTitle" defaultValue={article?.seoTitle ?? ""} placeholder="Defaults to the article title" className="text-[12px]" />
              </Field>
              <Field label="Meta description">
                <Textarea
                  name="seoDescription"
                  rows={3}
                  defaultValue={article?.seoDescription ?? ""}
                  placeholder="Up to 160 characters."
                  className="text-[12px]"
                />
              </Field>
            </div>
          </div>

          {canReview ? (
            <div className="rounded-xl border border-navy/10 bg-paper p-5">
              <label className="flex items-center gap-2.5 text-[12.5px] text-navy">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={article?.isFeatured}
                  className="h-4 w-4 rounded border-navy/30 text-gold focus:ring-gold"
                />
                Feature on the homepage and journal
              </label>
            </div>
          ) : null}
        </div>
      </div>

      {state.error ? (
        <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="flex items-start gap-2 rounded-lg border border-source/30 bg-source/5 px-3 py-2 text-xs text-source">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-navy/10 bg-[#f6f2e9]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="hidden text-[11px] text-stone-500 sm:block">
          {article ? "Saving records a new revision and updates the public article if published." : "New articles start as drafts. Submit for review when ready."}
        </p>
        <div className="flex items-center gap-2">
          <Link href="/admin/articles" className="rounded-full border border-navy/15 px-4 py-2 text-[12px] font-medium text-navy hover:bg-white">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-navy px-5 text-[12.5px] font-semibold text-paper hover:bg-navy-700 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving…" : "Save draft"}
          </button>
        </div>
      </div>
      </fieldset>
    </form>
  );
}
