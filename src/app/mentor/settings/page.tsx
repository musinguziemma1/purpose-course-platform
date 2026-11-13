import { AccountSettings } from "@/components/auth/account-settings";
import { getSessionUser } from "@/lib/auth";
export const metadata = { title: "Profile & settings" };
export default async function Page() {
  const user = await getSessionUser();
  return user ? <AccountSettings user={user} /> : null;
}
