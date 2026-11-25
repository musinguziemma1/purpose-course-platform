"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { CheckCircle2, Loader2, RotateCcw, Save } from "lucide-react";
import { savePurposeProfileAction } from "@/app/actions/purpose";
import { Field, Textarea } from "@/components/ui/field";
import type { ProfileSaveState } from "@/db/purpose-journey";
import { PRINCIPLE_INFO, type PrincipleKey } from "@/lib/purpose-journey";
import { cn } from "@/lib/utils";

type Values = Record<string, string>;
type FieldSpec = { name: string; label: string; hint: string; rows?: number; maxLength: number; list?: boolean };

const SECTIONS: { key: PrincipleKey; intro: string; fields: FieldSpec[] }[] = [
  {
    key: "identity",
    intro: "Who you are before the roles you perform.",
    fields: [
      { name: "identityStatement", label: "Identity statement", hint: "Two or three sentences in your own words: who you are and what you stand for.", rows: 3, maxLength: 1200 },
      { name: "coreValues", label: "Core values", hint: "One per line or separated by commas, for example: integrity, service, courage.", rows: 3, maxLength: 900, list: true },
      { name: "strengths", label: "Strengths", hint: "What people rely on you for. One per line.", rows: 3, maxLength: 900, list: true },
      { name: "interests", label: "Interests", hint: "Subjects, causes or activities that energise you.", rows: 2, maxLength: 900, list: true },
    ],
  },
  {
    key: "source",
    intro: "The experiences, people and beliefs that formed you.",
    fields: [
      { name: "story", label: "Your story", hint: "Formative experiences, turning points and lessons from your journey so far.", rows: 6, maxLength: 3000 },
      { name: "influences", label: "Influences", hint: "People, communities, faith and ideas that shaped how you see the world.", rows: 3, maxLength: 1500 },
    ],
  },
  {
    key: "purpose",
    intro: "Why you are here and the contribution you are called to make.",
    fields: [
      { name: "purposeStatement", label: "Purpose statement", hint: "A single statement you can live and lead from. You can refine it as you grow.", rows: 3, maxLength: 600 },
      { name: "contribution", label: "Contribution", hint: "Who you serve and the difference you want to make for them.", rows: 3, maxLength: 1500 },
    ],
  },
  {
    key: "potential",
    intro: "The capacity you are turning into competence.",
    fields: [
      { name: "skills", label: "Skills", hint: "Skills you already use well. One per line.", rows: 3, maxLength: 900, list: true },
      { name: "developmentAreas", label: "Areas for development", hint: "Skills or habits you want to grow next.", rows: 2, maxLength: 900, list: true },
      { name: "developmentObjectives", label: "Development objectives", hint: "What you will practise or learn over the next season, and how you will know it worked.", rows: 3, maxLength: 1500 },
    ],
  },
  {
    key: "destiny",
    intro: "Where you are going and the impact you want to leave.",
    fields: [
      { name: "vision", label: "Vision", hint: "Describe the future you are building toward in three to five years.", rows: 4, maxLength: 2000 },
      { name: "careerDirection", label: "Career or life direction", hint: "The field, role or assignment you are positioning yourself for.", rows: 2, maxLength: 1200 },
      { name: "impactAspirations", label: "Impact aspirations", hint: "The change you hope people and communities will see because of your life.", rows: 3, maxLength: 1500 },
    ],
  },
];

const FIELD_NAMES = SECTIONS.flatMap((section) => section.fields.map((field) => field.name));

function subscribeToStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function PurposeProfileForm({ profileId, initial, version: initialVersion, sharedWithMentor }: {
  profileId: string;
  initial: Values;
  version: number;
  sharedWithMentor: boolean;
}) {
  const draftKey = `purpose-profile-draft:${profileId}`;
  const [values, setValues] = useState<Values>(initial);
  const [saved, setSaved] = useState<Values>(initial);
  const [shared, setShared] = useState(sharedWithMentor);
  const [savedShared, setSavedShared] = useState(sharedWithMentor);
  const [version, setVersion] = useState(initialVersion);
  const [state, setState] = useState<ProfileSaveState>({});
  const [draftHandled, setDraftHandled] = useState(false);
  const [pending, startTransition] = useTransition();
  const statusRef = useRef<HTMLParagraphElement>(null);

  const dirty = useMemo(() => shared !== savedShared || FIELD_NAMES.some((name) => (values[name] ?? "") !== (saved[name] ?? "")), [saved, savedShared, shared, values]);

  // A draft left on this device by an earlier visit (read without an effect; null on the server).
  const storedDraft = useSyncExternalStore(subscribeToStorage, () => readStorage(draftKey), () => null);
  const draft = useMemo(() => {
    if (draftHandled || !storedDraft) return null;
    try {
      const parsed = JSON.parse(storedDraft) as { version: number; values: Values; savedAt: string };
      const differs = FIELD_NAMES.some((name) => (parsed.values?.[name] ?? "") !== (initial[name] ?? ""));
      // Only a draft written against the version just loaded can be restored safely.
      return parsed.version === initialVersion && differs ? { values: parsed.values, savedAt: parsed.savedAt } : null;
    } catch {
      return null;
    }
  }, [draftHandled, initial, initialVersion, storedDraft]);

  function edit(name: string, value: string) {
    setDraftHandled(true);
    setValues((current) => ({ ...current, [name]: value }));
  }

  // Keep a local draft while editing so an accidental close does not lose work.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(draftKey, JSON.stringify({ version, values, savedAt: new Date().toISOString() }));
      } catch {
        /* storage unavailable */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [dirty, draftKey, values, version]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await savePurposeProfileAction({}, formData);
      setState(result);
      if (result.ok && typeof result.version === "number") {
        setVersion(result.version);
        setSaved(values);
        setSavedShared(shared);
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          /* storage unavailable */
        }
      }
      statusRef.current?.focus();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <input type="hidden" name="version" value={version} />

      {draft ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-[14px] text-navy">
          <span>You have unsaved changes from {new Date(draft.savedAt).toLocaleString()} on this device.</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => { setValues({ ...initial, ...draft.values }); setDraftHandled(true); }} className="lk-btn lk-btn-navy lk-btn-sm">
              <RotateCcw aria-hidden className="h-4 w-4" /> Restore
            </button>
            <button type="button" onClick={() => { try { window.localStorage.removeItem(draftKey); } catch { /* storage unavailable */ } setDraftHandled(true); }} className="lk-btn lk-btn-paper lk-btn-sm">
              Discard
            </button>
          </span>
        </div>
      ) : null}

      {SECTIONS.map((section) => {
        const info = PRINCIPLE_INFO[section.key];
        return (
          <fieldset key={section.key} id={`principle-${section.key}`} className="lk-paper scroll-mt-24 p-5 sm:p-6">
            <legend className="sr-only">{info.name}</legend>
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full shadow-[inset_0_-1px_1px_rgba(0,0,0,0.3),0_0_0_2px_rgba(255,255,255,0.9),0_1px_2px_rgba(10,26,48,0.3)]" style={{ backgroundColor: info.color }} />
              <div>
                <h2 className="font-serif text-2xl text-navy">{info.name} <span className="text-[15px] font-sans text-stone-600">· {info.question}</span></h2>
                <p className="mt-1 text-[14px] text-stone-600">{section.intro}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              {section.fields.map((field) => (
                <Field key={field.name} label={field.label} hint={field.hint} className={cn(!field.list && (field.rows ?? 3) >= 4 && "lg:col-span-2")}>
                  <Textarea
                    name={field.name}
                    rows={field.rows ?? 3}
                    maxLength={field.maxLength}
                    value={values[field.name] ?? ""}
                    onChange={(event) => edit(field.name, event.target.value)}
                    className="min-h-0"
                  />
                </Field>
              ))}
            </div>
          </fieldset>
        );
      })}

      <section className="lk-paper p-5 sm:p-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="sharedWithMentor" checked={shared} onChange={(event) => setShared(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
          <span>
            <span className="block text-[15px] font-semibold text-navy">Share my Purpose Profile with my mentor and faculty</span>
            <span className="mt-0.5 block text-[13px] text-stone-600">Your mentor sees your progress either way. Your written profile stays private unless you share it, and you can stop sharing at any time.</span>
          </span>
        </label>
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(120,96,52,0.18)] bg-[#f8f2e4]/95 px-4 py-3 shadow-[0_-10px_22px_-20px_rgba(10,26,48,0.55)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <p ref={statusRef} tabIndex={-1} role="status" aria-live="polite" className={cn("text-[14px] outline-none", state.error ? "font-medium text-rose-700" : "text-stone-600")}>
          {state.error ? state.error : state.ok ? (
            <span className="inline-flex items-center gap-1.5 text-source"><CheckCircle2 aria-hidden className="h-4 w-4" /> {state.message} Version {version}.</span>
          ) : dirty ? "You have unsaved changes." : version ? `Saved · version ${version}` : "Not saved yet."}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="lk-btn lk-btn-navy px-6"
        >
          {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
          {pending ? "Saving…" : "Save Purpose Profile"}
        </button>
      </div>
    </form>
  );
}
