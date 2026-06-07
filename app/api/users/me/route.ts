import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(80).optional(),
  notification_preferences: z
    .object({
      email_match_reminders: z.boolean().optional(),
      email_score_updates: z.boolean().optional(),
      email_roster_changes: z.boolean().optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.display_name && !parsed.data.notification_preferences) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updates: Record<string, any> = { updated_at: new Date() };
  if (parsed.data.display_name !== undefined) updates.display_name = parsed.data.display_name;
  if (parsed.data.notification_preferences !== undefined) {
    for (const [k, v] of Object.entries(parsed.data.notification_preferences)) {
      if (v !== undefined) updates[`notification_preferences.${k}`] = v;
    }
  }

  const db = await getDb();
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(session.user.id) }, { $set: updates });

  return NextResponse.json({ message: "Profile updated" });
}
