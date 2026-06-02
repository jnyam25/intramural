import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { getSchoolId } from "@/lib/db/school-context";
import { getSession } from "@/lib/auth";
import { CreateTeamRequestSchema, TeamInviteDbSchema } from "@/lib/validations/team";

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
  const parsed = CreateTeamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { leagueId, name } = parsed.data;
  const db = await getScopedDb(schoolId);

  const league = await db.collection("leagues").findOne({
    _id: new ObjectId(leagueId),
    status: "open",
  });

  if (!league) {
    return NextResponse.json({ error: "League not found or not open for registration" }, { status: 404 });
  }

  const existingTeam = await db.collection("teams").findOne({
    league_id: leagueId,
    "roster.user_id": session.user.id,
  });

  if (existingTeam) {
    return NextResponse.json({ error: "You are already on a team in this league" }, { status: 409 });
  }

  const timestamp = new Date();
  const teamResult = await db.collection("teams").insertOne({
    league_id: leagueId,
    name,
    captain_user_id: session.user.id,
    roster: [
      {
        user_id: session.user.id,
        role: "captain",
        joined_at: timestamp,
        status: "approved",
      },
    ],
    status: "forming",
    created_at: timestamp,
  });

  const teamId = teamResult.insertedId.toString();
  const inviteToken = randomBytes(32).toString("hex");
  const inviteDoc = TeamInviteDbSchema.parse({
    school_id: schoolId,
    team_id: teamId,
    league_id: leagueId,
    token: inviteToken,
    created_by_user_id: session.user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    max_uses: 20,
    use_count: 0,
    is_revoked: false,
    created_at: timestamp,
  });

  await db.collection("team_invites").insertOne(inviteDoc);

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "TEAM_CREATED",
    entity_type: "team",
    entity_id: teamId,
    metadata: { leagueId, teamName: name },
  });

  return NextResponse.json(
    {
      message: "Team created",
      teamId,
      inviteToken,
      inviteUrl: `/teams/join?token=${inviteToken}`,
    },
    { status: 201 }
  );
}
