import { updateNotificationPreference } from "@/app/actions/platform";
import type { getPreferences } from "@/lib/notifications";

type Preference = Awaited<ReturnType<typeof getPreferences>>[number];

/**
 * Delivery preferences as a row of slide switches per category. Each row is its
 * own form posting to updateNotificationPreference, exactly as before; only the
 * controls changed (native checkboxes styled as switches, 44px label targets).
 */
export function PreferenceList({ preferences }: { preferences: Preference[] }) {
  return (
    <ul className="lk-ledger">
      {preferences.map((preference) => (
        <li key={preference.category} className="px-2 py-3">
          <form action={updateNotificationPreference} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <input type="hidden" name="category" value={preference.category} />
            <p className="min-w-[7rem] flex-1 text-[14px] font-medium capitalize text-navy">{preference.category}</p>
            {(
              [
                ["inApp", "In-app", preference.inApp],
                ["email", "Email", preference.email],
                ["push", "Push", preference.push],
              ] as const
            ).map(([name, label, checked]) => (
              <label key={name} className="inline-flex min-h-11 items-center gap-2 text-[13px] text-stone-700">
                <input type="checkbox" name={name} defaultChecked={checked} className="lk-switch" />
                {label}
              </label>
            ))}
            <button type="submit" className="lk-btn lk-btn-paper lk-btn-sm">
              Save<span className="sr-only"> {preference.category} preferences</span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
