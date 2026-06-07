import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const inviteCode = body?.inviteCode;

  if (!inviteCode) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    );
  }

  const db = await getScopedDb(schoolId);
  
  // Find team by ID and verify invite code
  const team = await db.collection("teams").findOne({
    _id: new ObjectId(params.teamId),
    school_id: schoolId,
    invite_code: inviteCode.toUpperCase(),
  });

  if (!team) {
    return NextResponse.json(
      { error: "Invalid team or invite code" },
      { status: 404 }
    );
  }

  // Check if user is already on this team
  const existingMember = team.roster?.find(
    (m: any) => m.user_id === session.user.id
  );
  
  if (existingMember) {
    if (existingMember.status === "approved") {
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 409 }
      );
    }
    // If pending, just return success (they already requested)
    return NextResponse.json({
      message: "Join request already pending captain approval",
      status: "pending",
    });
  }

  // Check if user is on another team in the same league
  const otherTeam = await db.collection("teams").findOne({
    league_id: team.league_id,
    "roster.user_id": session.user.id,
    "roster.status": "approved",
  });

  if (otherTeam) {
    return NextResponse.json(
      { error: "You are already on a team in this league" },
      { status: 409 }
    );
  }

  const now = new Date();
  
  // Add to roster with pending status
  await db.collection("teams").updateOne(
    { _id: team._id },
    {
      $push: {
        roster: {
          user_id: session.user.id,
          status: "pending",
          role: "player",
          joined_at: now,
          is_active: true,
        },
      },
      $set: { updated_at: now },
    }
  );

  // Create notification for captain
  await db.collection("notifications").insertOne({
    _id: new ObjectId(),
    user_id: team.captain_user_id,
    type: "roster_request",
    title: "New Join Request",
    body: `${session.user.first_name} ${session.user.last_name} wants to join ${team.name}`,
    action_url: `/teams/${params.teamId}/roster`,
    read_at: null,
    email_sent_at: null,
    created_at: now,
  });

  // Log audit
  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp: now,
    actor_user_id: session.user.id,
    action: "ROSTER_JOINED",
    entity_type: "team",
    entity_id: params.teamId,
    metadata: { 
      team_name: team.name,
      status: "pending",
      invite_code: inviteCode.toUpperCase()
    },
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json({
    message: "Join request submitted. Awaiting captain approval.",
    status: "pending",
  });
}
