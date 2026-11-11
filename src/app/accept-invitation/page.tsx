import type { Metadata } from "next";
import { InvitationForm } from "@/components/auth/invitation-form";

export const metadata: Metadata = { title: "Activate your account", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function AcceptInvitationPage() {
  return <main className="mx-auto max-w-lg px-5 py-16"><h1 className="mb-3 font-serif text-3xl text-navy">Activate your Purpose Course account</h1><p className="mb-6 text-sm text-stone-600">Set a password to accept your invitation. Your administrator will arrange course enrollment separately.</p><InvitationForm /></main>;
}
