import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { getSchoolId } from "@/lib/db/school-context";
import { getSession } from "@/lib/auth";
import { JoinTeamRequestSchema } from "@/lib/validations/team";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = JoinTeamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite token" }, { status: 400 });
  }

  const { token } = parsed.data;
  const db = await getScopedDb(schoolId);

  const invite = await db.collection("team_invites").findOneAndUpdate(
    {
      token,
      is_revoked: false,
      expires_at: { $gt: new Date() },
      $expr: { $lt: ["$use_count", "$max_uses"] },
    },
    { $inc: { use_count: 1 } },
    { returnDocument: "after" }
  );

  if (!invite) {
    return NextResponse.json({ error: "Invite link is invalid, expired, or revoked" }, { status: 404 });
  }

  const team = await db.collection("teams").findOne({ _id: new ObjectId(invite.team_id) });
  if (!team) {
    return NextResponse.json({ error: "Team no longer exists" }, { status: 404 });
  }

  const league = await db.collection("leagues").findOne({ _id: new ObjectId(invite.league_id) });
  if (league && team.roster.length >= league.max_roster_size) {
    return NextResponse.json({ error: "Team roster is full" }, { status: 409 });
  }

  const alreadyOnTeam = await db.collection("teams").findOne({
    league_id: invite.league_id,
    "roster.user_id": session.user.id,
  });
  if (alreadyOnTeam) {
    return NextResponse.json({ error: "You are already on a team in this league" }, { status: 409 });
  }

  const waiverSigned = await db.collection("waiver_signatures").findOne({
    user_id: session.user.id,
    league_id: invite.league_id,
  });

  const timestamp = new Date();
  await db.collection("teams").updateOne(
    { _id: new ObjectId(invite.team_id) },
    {
      $push: {
        roster: {
          user_id: session.user.id,
          role: "player",
          joined_at: timestamp,
          status: "pending_approval",
          waiver_signed: !!waiverSigned,
        },
      },
    }
  );

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "ROSTER_JOINED",
    entity_type: "team",
    entity_id: team._id.toString(),
    metadata: { league_id: invite.league_id },
  });

  return NextResponse.json({
    message: waiverSigned
      ? "Joined team. Awaiting captain approval."
      : "Joined team. Please sign the waiver to be approved for play.",
    teamId: team._id.toString(),
  });
}
