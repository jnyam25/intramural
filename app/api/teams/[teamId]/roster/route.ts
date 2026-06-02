import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { getSchoolId } from "@/lib/db/school-context";
import { getSession } from "@/lib/auth";
import { ApproveRosterMemberSchema } from "@/lib/validations/team";

export async function PATCH(req: NextRequest, { params }: { params: { teamId: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ApproveRosterMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { userId, action } = parsed.data;
  const db = await getScopedDb(schoolId);
  const team = await db.collection("teams").findOne({ _id: new ObjectId(params.teamId) });

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.captain_user_id !== session.user.id) {
    return NextResponse.json({ error: "Only the captain can manage the roster" }, { status: 403 });
  }

  const timestamp = new Date();

  if (action === "remove") {
    await db.collection("teams").updateOne(
      { _id: new ObjectId(params.teamId) },
      { $pull: { roster: { user_id: userId } } }
    );
    await db.collection("audit_logs").insertOne({
      school_id: schoolId,
      timestamp,
      actor_user_id: session.user.id,
      action: "ROSTER_REMOVED",
      entity_type: "team",
      entity_id: params.teamId,
      metadata: { removed_user_id: userId },
    });
    return NextResponse.json({ message: "Member removed" });
  }

  const waiverSigned = await db.collection("waiver_signatures").findOne({
    user_id: userId,
    league_id: team.league_id,
  });
  if (!waiverSigned) {
    return NextResponse.json(
      { error: "Cannot approve: player has not signed the waiver" },
      { status: 400 }
    );
  }

  await db.collection("teams").updateOne(
    { _id: new ObjectId(params.teamId), "roster.user_id": userId },
    {
      $set: {
        "roster.$.status": "approved",
        "roster.$.waiver_signed": true,
      },
    }
  );

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "ROSTER_APPROVED",
    entity_type: "team",
    entity_id: params.teamId,
    metadata: { approved_user_id: userId },
  });

  return NextResponse.json({ message: "Member approved" });
}
