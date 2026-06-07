import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/auth/permissions";

// POST /api/admin/schedule/publish - Publish draft schedule
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  // Verify admin permission
  const db = await getScopedDb(schoolId);
  const assignments = await db
    .collection("role_assignments")
    .find({ user_id: session.user.id, school_id: schoolId, revoked_at: null })
    .toArray();

  if (!hasPermission(assignments, "school:manage_leagues")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.scheduleId) {
    return NextResponse.json({ error: "Schedule ID required" }, { status: 400 });
  }

  // Get schedule
  const schedule = await db.collection("schedules").findOne({
    _id: new ObjectId(body.scheduleId),
  });

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  if (schedule.status === "published") {
    return NextResponse.json({ error: "Schedule already published" }, { status: 400 });
  }

  const now = new Date();

  // Create matches
  const matches = schedule.matches.map((match: any) => ({
    _id: new ObjectId(),
    league_id: schedule.league_id,
    school_id: schoolId,
    home_team_id: match.home_team_id,
    away_team_id: match.away_team_id,
    scheduled_at: new Date(match.scheduled_at),
    status: "scheduled",
    location: null, // Admin can edit later
    created_at: now,
    updated_at: now,
  }));

  await db.collection("matches").insertMany(matches);

  // Update schedule status
  await db.collection("schedules").updateOne(
    { _id: schedule._id },
    { $set: { status: "published", published_at: now } }
  );

  // Log audit
  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp: now,
    actor_user_id: session.user.id,
    action: "SCHEDULE_PUBLISHED",
    entity_type: "league",
    entity_id: schedule.league_id,
    metadata: {
      schedule_id: body.scheduleId,
      matches_created: matches.length,
    },
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json({
    message: "Schedule published successfully",
    matches_created: matches.length,
  });
}
