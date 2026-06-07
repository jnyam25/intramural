import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { ObjectId } from "mongodb";
import { z } from "zod";

const GrantRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["sports_admin", "league_admin", "coach", "referee", "captain", "participant"]),
  scope: z
    .object({
      sport_id: z.string().optional(),
      league_id: z.string().optional(),
      team_id: z.string().optional(),
    })
    .optional(),
});

const RevokeRoleSchema = z.object({
  assignmentId: z.string().length(24),
  reason: z.string().optional(),
});

async function requireRoleAdmin() {
  const session = await getSessionWithRoles();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasPermission(session.assignments, "school:assign_roles")) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { session };
}

export async function POST(req: NextRequest) {
  const auth = await requireRoleAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = GrantRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, role, scope } = parsed.data;
  const db = await getScopedDb(auth.session.schoolId);
  const timestamp = new Date();

  const existing = await db.collection("role_assignments").findOne({
    user_id: userId,
    role,
    ...(scope?.sport_id ? { "scope.sport_id": scope.sport_id } : {}),
    ...(scope?.league_id ? { "scope.league_id": scope.league_id } : {}),
    ...(scope?.team_id ? { "scope.team_id": scope.team_id } : {}),
    revoked_at: { $exists: false },
  });

  if (existing) {
    return NextResponse.json({ error: "This role is already active for this user and scope" }, { status: 409 });
  }

  await db.collection("role_assignments").insertOne({
    user_id: userId,
    role,
    scope: scope ?? {},
    granted_by_user_id: auth.session.userId,
    granted_at: timestamp,
  });

  await db.collection("audit_logs").insertOne({
    timestamp,
    actor_user_id: auth.session.userId,
    action: "ROLE_GRANTED",
    entity_type: "role_assignment",
    entity_id: userId,
    metadata: { role, scope },
  });

  return NextResponse.json({ message: `Role "${role}" granted to user ${userId}` }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRoleAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = RevokeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getScopedDb(auth.session.schoolId);
  const timestamp = new Date();
  const result = await db.collection("role_assignments").updateOne(
    { _id: new ObjectId(parsed.data.assignmentId), revoked_at: { $exists: false } },
    {
      $set: {
        revoked_at: timestamp,
        revoked_by_user_id: auth.session.userId,
        reason: parsed.data.reason ?? "Revoked by school admin",
      },
    }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Role assignment not found" }, { status: 404 });
  }

  await db.collection("audit_logs").insertOne({
    timestamp,
    actor_user_id: auth.session.userId,
    action: "ROLE_REVOKED",
    entity_type: "role_assignment",
    entity_id: parsed.data.assignmentId,
    metadata: { reason: parsed.data.reason },
  });

  return NextResponse.json({ message: "Role revoked" });
}
