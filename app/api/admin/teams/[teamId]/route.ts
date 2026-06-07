import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";

const AdminTeamActionSchema = z.object({
  action: z.enum(["approve", "reject", "disband"]),
  reason: z.string().optional(),
});

const ACTION_AUDIT: Record<string, string> = {
  approve: "TEAM_APPROVED",
  reject: "TEAM_REJECTED",
  disband: "TEAM_DISBANDED",
};

const ACTION_STATUS: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  disband: "archived",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getSessionWithRoles();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.assignments, "team:approve")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AdminTeamActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, reason } = parsed.data;
  const db = await getScopedDb(session.schoolId);

  const team = await db.collection("teams").findOne({ _id: new ObjectId(params.teamId) });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const now = new Date();
  await db.collection("teams").updateOne(
    { _id: new ObjectId(params.teamId) },
    { $set: { status: ACTION_STATUS[action], updated_at: now } }
  );

  await db.collection("audit_logs").insertOne({
    school_id: session.schoolId,
    timestamp: now,
    actor_user_id: session.userId,
    action: ACTION_AUDIT[action],
    entity_type: "team",
    entity_id: params.teamId,
    metadata: { reason: reason ?? null },
  });

  return NextResponse.json({ message: `Team ${action}d` });
}
