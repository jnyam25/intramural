import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = GrantRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, role, scope } = parsed.data;
  const db = await getScopedDb(schoolId);
  const timestamp = new Date();

  // Prevent duplicate active grants
  const existing = await db.collection("role_assignments").findOne({
    user_id: userId,
    role,
    ...(scope?.league_id ? { "scope.league_id": scope.league_id } : {}),
    revoked_at: { $exists: false },
  });

  if (existing) {
    return NextResponse.json({ error: "This role is already active for this user and scope" }, { status: 409 });
  }

  await db.collection("role_assignments").insertOne({
    user_id: userId,
    school_id: schoolId,
    role,
    scope: scope ?? {},
    granted_by_user_id: session.user.id,
    granted_at: timestamp,
  });

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "ROLE_GRANTED",
    entity_type: "role_assignment",
    entity_id: userId,
    metadata: { role, scope },
  });

  return NextResponse.json({ message: `Role "${role}" granted to user ${userId}` }, { status: 201 });
}
