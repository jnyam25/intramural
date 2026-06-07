import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { getSchoolId } from "@/lib/db/school-context";
import { getSession } from "@/lib/auth";
import { hasPermission, parseRoleAssignments } from "@/lib/auth/permissions";
import { ApproveScoreRequestSchema } from "@/lib/validations/match";
import { updateLeagueStandings } from "@/lib/standings/updater";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 401 });
  }

  const db = await getScopedDb(schoolId);
  const assignments = parseRoleAssignments(
    await db
      .collection("role_assignments")
      .find({ user_id: session.user.id, school_id: schoolId, revoked_at: null })
      .toArray()
  );
  if (!hasPermission(assignments, "score:resolve_dispute")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ApproveScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { decision, dispute_notes } = parsed.data;
  const timestamp = new Date();

  const submissions = await db
    .collection("score_submissions")
    .find({ match_id: matchId, status: "pending" })
    .toArray();

  if (decision === "approve") {
    const chosen = submissions[submissions.length - 1];
    if (!chosen) {
      return NextResponse.json({ error: "No pending submissions" }, { status: 400 });
    }

    await db.collection("score_submissions").updateMany(
      { match_id: matchId },
      {
        $set: {
          status: "approved",
          admin_notes: dispute_notes,
          approved_at: timestamp,
        },
      }
    );
    await db.collection("matches").updateOne(
      { _id: new ObjectId(matchId) },
      {
        $set: {
          status: "completed",
          home_team_score: chosen.home_team_score,
          away_team_score: chosen.away_team_score,
        },
      }
    );
    const matchDoc = await db.collection("matches").findOne({ _id: new ObjectId(matchId) });
    if (matchDoc?.league_id) {
      updateLeagueStandings(matchDoc.league_id as string, schoolId).catch(() => {});
    }
  } else {
    await db.collection("matches").updateOne(
      { _id: new ObjectId(matchId) },
      { $set: { status: "disputed", admin_notes: dispute_notes } }
    );
  }

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "SCORE_APPROVED",
    entity_type: "match",
    entity_id: matchId,
    metadata: { decision, dispute_notes },
  });

  return NextResponse.json({ message: `Score ${decision}d` });
}
