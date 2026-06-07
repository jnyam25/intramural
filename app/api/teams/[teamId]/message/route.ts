import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";

const BroadcastSchema = z.object({
  content: z.string().min(1).max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 401 });
  }

  const db = await getScopedDb(schoolId);

  // Verify team exists within this school
  const team = await db.collection("teams").findOne({ _id: new ObjectId(teamId) });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Verify caller has a coach role assignment scoped to this team
  const coachAssignment = await db.collection("role_assignments").findOne({
    user_id: session.user.id,
    role: "coach",
    "scope.team_id": teamId,
    revoked_at: { $exists: false },
  });
  if (!coachAssignment) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = new Date();
  await db.collection("messages").insertOne({
    _id: new ObjectId(),
    team_id: teamId,
    sender_user_id: session.user.id,
    content: parsed.data.content,
    message_type: "broadcast",
    created_at: now,
    edited_at: null,
    deleted_at: null,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
