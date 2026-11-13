import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackdrop } from "@/components/site/hero-backdrop";

export const metadata: Metadata = { title: "Privacy and data use", description: "How Purpose Course uses account information, learning records and contact enquiries." };

export default function PrivacyPage() {
  return <article className="shell-narrow py-12 sm:py-16">
    <header className="relative isolate overflow-hidden rounded-2xl border border-navy/10 bg-paper p-6 sm:p-9">
    <HeroBackdrop src="/images/learning-materials.jpg" />
    <div className="relative"><p className="eyebrow">Purpose Course</p><h1 className="mt-3 font-serif text-3xl text-navy sm:text-4xl">Privacy and data use</h1>
    <p className="mt-3 text-sm text-stone-600">Updated 13 November 2026</p></div>
    </header>
    <p className="mt-6 leading-relaxed text-stone-700">Purpose Course stores information needed to operate the learning programme, support learners and respond to enquiries. This notice describes the current platform.</p>
    <div className="mt-8 space-y-7 text-sm leading-relaxed text-stone-700">
      <section><h2 className="font-serif text-xl text-navy">Accounts and sign-in</h2><p className="mt-2">Account records include your name, email address, role and profile information. Required profile details include a phone number, city/country, time zone and a short introduction. Contact details support course administration and are not listed in the public team directory. New student applications require staff approval; their passwords are stored as salted hashes. An essential sign-in cookie keeps your session active until you sign out or it expires. Deactivated accounts cannot sign in.</p></section>
      <section><h2 className="font-serif text-xl text-navy">Uploaded files</h2><p className="mt-2">Uploaded media and assignment attachments are stored in private Supabase Storage. Staff can access the shared media library. Learners can access materials published or assigned to them and their own submission files; assigned mentors can read submitted work. Files explicitly reused in public articles, course covers or public resource listings can be accessed by visitors. Private downloads use short-lived links.</p></section>
      <section><h2 className="font-serif text-xl text-navy">Learning and mentoring</h2><p className="mt-2">The platform records enrolment, lesson progress, assessment attempts, assignments, goals, mentoring activity and issued certificates. Staff access follows role permissions and learner assignments. Personal assessment instruments ask for consent; their results are private by default, with a separate sharing choice. Review your sharing choices before submitting sensitive reflections or assessments.</p></section>
      <section><h2 className="font-serif text-xl text-navy">Community participation</h2><p className="mt-2">Your profile name appears with discussions and replies you post. Public spaces can be read by website visitors; restricted spaces require the appropriate membership or moderation access. Choose what you share with the audience of each space.</p></section>
      <section><h2 className="font-serif text-xl text-navy">Contact, subscriptions and email</h2><p className="mt-2">Contact enquiries store the name, email and message you provide in a staff inbox. The contact form uses a hashed client identifier to limit repeated submissions. Newsletter forms store the details you submit. When transactional email is enabled, invitations, account messages and staff replies use Resend. Please avoid sending passwords or unnecessary sensitive information in enquiries.</p></section>
      <section><h2 className="font-serif text-xl text-navy">Service providers and activity records</h2><p className="mt-2">Application records are stored in Supabase PostgreSQL. Operational logs and learning events support access control, troubleshooting and learning reports. The platform uses essential session cookies; no advertising analytics integration is configured in this application. Connected providers process the information needed to deliver their services.</p></section>
      <section><h2 className="font-serif text-xl text-navy">Questions, corrections and account requests</h2><p className="mt-2">Use the contact page to ask about information held for your account, request a correction, discuss subscription preferences, or request account/data removal. Staff will confirm the relevant account and explain what can be removed and which learning, delivery or audit records need to be retained. Signing out or deactivating an account does not itself delete its records.</p><Link href="/contact" className="mt-3 inline-block font-semibold text-navy underline decoration-gold underline-offset-4">Contact the Purpose Course team</Link></section>
    </div>
  </article>;
}
