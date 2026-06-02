import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { getSchoolId } from "@/lib/db/school-context";
import { getSession } from "@/lib/auth";
import { ApproveScoreRequestSchema } from "@/lib/validations/match";

export async function PATCH(req: NextRequest, { params }: { params: { matchId: string } }) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ApproveScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { decision, dispute_notes } = parsed.data;
  const db = await getScopedDb(schoolId);
  const timestamp = new Date();

  const submissions = await db
    .collection("score_submissions")
    .find({ match_id: params.matchId, status: "pending" })
    .toArray();

  if (decision === "approve") {
    const chosen = submissions[submissions.length - 1];
    if (!chosen) {
      return NextResponse.json({ error: "No pending submissions" }, { status: 400 });
    }

    await db.collection("score_submissions").updateMany(
      { match_id: params.matchId },
      {
        $set: {
          status: "approved",
          admin_notes: dispute_notes,
          approved_at: timestamp,
        },
      }
    );
    await db.collection("matches").updateOne(
      { _id: new ObjectId(params.matchId) },
      { $set: { status: "completed" } }
    );
  } else {
    await db.collection("matches").updateOne(
      { _id: new ObjectId(params.matchId) },
      { $set: { status: "disputed", admin_notes: dispute_notes } }
    );
  }

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "SCORE_APPROVED",
    entity_type: "match",
    entity_id: params.matchId,
    metadata: { decision, dispute_notes },
  });

  return NextResponse.json({ message: `Score ${decision}d` });
}
