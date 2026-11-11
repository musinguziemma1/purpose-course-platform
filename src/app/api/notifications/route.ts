import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getNotificationsFor } from "@/db/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ notifications: [], unread: 0 });

  const rows = await getNotificationsFor(user.profileId);
  return NextResponse.json({
    notifications: rows,
    unread: rows.filter((item) => !item.isRead).length,
  });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.recipientId, user.profileId), eq(notifications.isRead, false)));

  return NextResponse.json({ ok: true });
}
