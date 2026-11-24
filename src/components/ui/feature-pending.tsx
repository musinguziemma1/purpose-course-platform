import { Hourglass } from "lucide-react";

/** Shown when a feature's database migration has not been applied yet. */
export function FeaturePending({ feature, staff = false }: { feature: string; staff?: boolean }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-gold/35 bg-gold/[0.08] p-5">
      <Hourglass aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" />
      <div>
        <p className="text-[15px] font-semibold text-navy">{feature} is being set up</p>
        <p className="mt-1 text-[14px] leading-relaxed text-stone-700">
          {staff
            ? "Its database tables are not in this environment yet. Apply the pending migration with `npm run db:migrate:supabase apply`; the feature turns on automatically, with no redeploy."
            : "It will appear here automatically as soon as setup is complete. Everything else keeps working as usual."}
        </p>
      </div>
    </div>
  );
}
