import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AccountSettings } from "@/components/auth/account-settings";
import { logoutAction } from "@/app/actions/auth";

export const metadata = { title: "Profile & settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/account");
  return <main className="min-h-screen bg-cream px-4 py-8 sm:px-6 sm:py-12"><div className="mx-auto max-w-3xl"><AccountSettings user={user} /><form action={logoutAction} className="mt-6 text-center"><button className="text-sm font-medium text-stone-600 underline underline-offset-4">Sign out</button></form></div></main>;
}
