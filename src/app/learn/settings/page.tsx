import { AccountSettings } from "@/components/auth/account-settings";
import { getSessionUser } from "@/lib/auth";

export const metadata = { title: "Profile & settings" };

/* AccountSettings brings its own heading, so it sits on a single sheet of paper. */
export default async function Page() {
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <div className="lk-paper lk-stack mx-auto max-w-4xl p-6 sm:p-8">
      <AccountSettings user={user} />
    </div>
  );
}
