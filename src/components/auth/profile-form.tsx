"use client";

import { useActionState } from "react";
import { updateOwnProfile, type ProfileState } from "@/app/actions/account";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { ProfileInput } from "@/lib/profile";

export function ProfileForm({ profile }: { profile: ProfileInput }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateOwnProfile,
    {},
  );
  return (
    <form action={action} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={profile.fullName}
          />
        </Field>
        <Field label="Title or occupation" hint="optional">
          <Input
            name="title"
            autoComplete="organization-title"
            maxLength={160}
            defaultValue={profile.title}
          />
        </Field>
        <Field label="Phone number" hint="include country code">
          <Input
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            maxLength={32}
            defaultValue={profile.phone}
            placeholder="+256 …"
          />
        </Field>
        <Field label="City and country">
          <Input
            name="location"
            autoComplete="address-level2"
            required
            minLength={2}
            maxLength={160}
            defaultValue={profile.location}
            placeholder="Kampala, Uganda"
          />
        </Field>
        <Field
          label="Time zone"
          htmlFor="profile-timezone"
          hint="used for learning schedules"
        >
          <Input
            id="profile-timezone"
            name="timezone"
            required
            maxLength={64}
            defaultValue={profile.timezone}
            list="profile-timezones"
          />
          <datalist id="profile-timezones">
            {[
              "Africa/Kampala",
              "Africa/Nairobi",
              "Africa/Kigali",
              "Africa/Lagos",
              "Africa/Johannesburg",
              "Europe/London",
              "America/New_York",
              "Asia/Dubai",
              "UTC",
            ].map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </Field>
        <Field label="Profile photo URL" hint="optional HTTPS image">
          <Input
            name="avatarUrl"
            maxLength={2000}
            defaultValue={profile.avatarUrl}
            placeholder="https://…"
          />
        </Field>
      </div>
      <Field label="About you" hint="20–2,000 characters">
        <Textarea
          name="bio"
          required
          minLength={20}
          maxLength={2000}
          rows={4}
          defaultValue={profile.bio}
          placeholder="Introduce yourself and what you hope to learn or contribute."
        />
      </Field>
      {state.error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p
          role="status"
          className="rounded-xl bg-source/10 p-3 text-sm text-source"
        >
          {state.message}
        </p>
      ) : null}
      <button
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-full bg-navy px-6 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {pending ? "Saving profile…" : "Save my profile"}
      </button>
    </form>
  );
}
