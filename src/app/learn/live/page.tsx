import Link from "next/link";
import{getSessionUser}from"@/lib/auth";
import{getEventCalendar}from"@/db/live-events";
import{EventCalendar}from"@/components/academy/event-calendar";
export const dynamic="force-dynamic";
export const metadata={title:"Live sessions"};
export default async function StudentLivePage(){const user=await getSessionUser();if(!user)return null;const events=await getEventCalendar(user,{limit:60});return <div className="space-y-5"><div><h1 className="font-serif text-3xl text-navy">Live sessions</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-600">Explore the programme calendar. Your course enrolment and cohort placement determine which teaching rooms and recordings you can open.</p><Link href="/events?past=1" className="mt-3 inline-block text-sm font-semibold text-gold-dark underline">Past sessions and recordings</Link></div><EventCalendar initialEvents={events.map(row=>({...row,startsAt:row.startsAt.toISOString()}))}/></div>;}
