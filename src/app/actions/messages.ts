"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, messages, profiles, roles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";

export type ContactState = { ok?: boolean; error?: string; message?: string };

export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!name) return { error: "Please share your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right." };
  if (subject.length < 4) return { error: "Add a short subject." };
  if (body.length < 30) return { error: "Please add a little more detail (30+ characters)." };

  const staff = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(roles, eq(profiles.roleId, roles.id))
    .where(inArray(roles.slug, ["super_admin", "platform_admin", "program_manager", "editor"]));

  const user = await getSessionUser();

  if (staff.length) {
    await db.insert(messages).values(
      staff.map((member) => ({
        senderId: user?.profileId ?? null,
        recipientId: member.id,
        subject: `Website enquiry — ${subject}`.slice(0, 200),
        body: `${body}\n\n— ${name} (${email})`,
        contextType: "contact",
      })),
    );
  }

  await db.insert(activityLogs).values({
    actorId: user?.profileId ?? null,
    action: "contact.message_received",
    entityType: "message",
    description: `Contact enquiry from ${name} <${email}>: ${subject}`.slice(0, 240),
  });

  if (staff.length) {
    await notify({
      recipientIds: staff.map((member) => member.id),
      templateKey: "contact.message_received",
      vars: { from: `${name} · ${email}`, subject },
      channels: ["in_app"],
    }).catch(() => undefined);
  }

  return {
    ok: true,
    message: `Thank you, ${name.split(" ")[0]}. Your message is with the faculty desk — we reply from ssenyondolex@gmail.com within two working days.`,
  };
}
