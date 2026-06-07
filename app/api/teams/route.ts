import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/auth/permissions";

// Helper to generate short invite code (8 chars, URL-safe)
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar-looking chars
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/teams - List teams or get single team
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get("leagueId");
  const inviteCode = searchParams.get("inviteCode");
  
  const db = await getScopedDb(schoolId);
  
  // Lookup by invite code
  if (inviteCode) {
    const team = await db.collection("teams").findOne({ 
      invite_code: inviteCode.toUpperCase(),
      school_id: schoolId
    });
    
    if (!team) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      team: {
        ...team,
        id: team._id.toString(),
        _id: undefined,
      }
    });
  }
  
  // List teams
  const filter: any = {};
  if (leagueId) filter.league_id = leagueId;
  
  const teams = await db.collection("teams").find(filter).toArray();
  
  return NextResponse.json({ 
    teams: teams.map(t => ({
      ...t,
      id: t._id.toString(),
      _id: undefined,
    }))
  });
}

// POST /api/teams - Create new team
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.leagueId) {
    return NextResponse.json(
      { error: "Team name and league ID are required" },
      { status: 400 }
    );
  }

  const db = await getScopedDb(schoolId);
  
  // Verify league exists and is accepting registrations
  const league = await db.collection("leagues").findOne({ 
    _id: new ObjectId(body.leagueId),
    school_id: schoolId
  });
  
  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }
  
  if (league.status !== "registration") {
    return NextResponse.json(
      { error: "League is not accepting new teams" },
      { status: 400 }
    );
  }
  
  // Check if user already has a team in this league
  const existingTeam = await db.collection("teams").findOne({
    league_id: body.leagueId,
    "roster.user_id": session.user.id,
  });
  
  if (existingTeam) {
    return NextResponse.json(
      { error: "You are already on a team in this league" },
      { status: 409 }
    );
  }

  const now = new Date();
  const inviteCode = generateInviteCode();
  
  const teamDoc = {
    _id: new ObjectId(),
    name: body.name.trim(),
    school_id: schoolId,
    league_id: body.leagueId,
    captain_user_id: session.user.id,
    invite_code: inviteCode,
    roster: [{
      user_id: session.user.id,
      status: "approved",
      role: "captain",
      joined_at: now,
      is_active: true,
    }],
    status: "forming",
    created_at: now,
    updated_at: now,
  };

  const result = await db.collection("teams").insertOne(teamDoc);
  
  // Log audit
  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp: now,
    actor_user_id: session.user.id,
    action: "TEAM_CREATED",
    entity_type: "team",
    entity_id: result.insertedId.toString(),
    metadata: { 
      team_name: body.name,
      league_id: body.leagueId,
      invite_code: inviteCode 
    },
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json({
    message: "Team created successfully",
    team: {
      id: result.insertedId.toString(),
      name: teamDoc.name,
      inviteCode: teamDoc.invite_code,
    },
  }, { status: 201 });
}
