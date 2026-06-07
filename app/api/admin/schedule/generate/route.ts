import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission, parseRoleAssignments } from "@/lib/auth/permissions";

// Round-robin algorithm for generating matches
function generateRoundRobin(teams: string[], startDate: Date, matchDurationMinutes: number = 90) {
  const n = teams.length;
  if (n < 2) return [];

  // For odd number of teams, add a "bye"
  const teamsCopy = [...teams];
  if (n % 2 === 1) {
    teamsCopy.push("BYE");
  }

  const numTeams = teamsCopy.length;
  const numRounds = numTeams - 1;
  const halfSize = numTeams / 2;

  const matches = [];
  let currentDate = new Date(startDate);

  // Fixed team (first position)
  const fixed = teamsCopy[0];
  const rotating = teamsCopy.slice(1);

  for (let round = 0; round < numRounds; round++) {
    // Pair fixed team with last rotating team
    const roundMatches = [];
    
    // Match 1: fixed vs last rotating
    if (rotating[rotating.length - 1] !== "BYE" && fixed !== "BYE") {
      roundMatches.push({
        home_team_id: fixed,
        away_team_id: rotating[rotating.length - 1],
        round: round + 1,
        scheduled_at: new Date(currentDate),
      });
      // Add buffer time between matches on same day
      currentDate = new Date(currentDate.getTime() + matchDurationMinutes * 60000 + 30 * 60000); // 90 min game + 30 min buffer
    }

    // Remaining pairs
    for (let i = 0; i < halfSize - 1; i++) {
      const home = rotating[i];
      const away = rotating[rotating.length - 2 - i];
      
      if (home !== "BYE" && away !== "BYE") {
        roundMatches.push({
          home_team_id: home,
          away_team_id: away,
          round: round + 1,
          scheduled_at: new Date(currentDate),
        });
        currentDate = new Date(currentDate.getTime() + matchDurationMinutes * 60000 + 30 * 60000);
      }
    }

    // Only add matches if there are valid matches this round
    if (roundMatches.length > 0) {
      matches.push(...roundMatches);
    }

    // Rotate teams for next round (keep first fixed, rotate others)
    const last = rotating.pop()!;
    rotating.unshift(last);

    // Move to next week for next round
    currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + (round + 1) * 7);
  }

  return matches;
}

// POST /api/admin/schedule/generate - Generate round-robin schedule
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
  const assignments = parseRoleAssignments(
    await db
      .collection("role_assignments")
      .find({ user_id: session.user.id, school_id: schoolId, revoked_at: null })
      .toArray()
  );

  if (!hasPermission(assignments, "school:manage_leagues")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.leagueId) {
    return NextResponse.json({ error: "League ID required" }, { status: 400 });
  }

  // Get league details
  const league = await db.collection("leagues").findOne({
    _id: new ObjectId(body.leagueId),
    school_id: schoolId,
  });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  // Get all teams in league
  const teams = await db
    .collection("teams")
    .find({ league_id: body.leagueId, status: { $in: ["forming", "full", "approved"] } })
    .toArray();

  if (teams.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 teams to generate schedule" },
      { status: 400 }
    );
  }

  const teamIds = teams.map((t: any) => t._id.toString());

  // Generate schedule
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const matchDuration = body.matchDurationMinutes || 90;
  
  const generatedMatches = generateRoundRobin(teamIds, startDate, matchDuration);

  // Save draft schedule
  const now = new Date();
  const scheduleDoc = {
    _id: new ObjectId(),
    league_id: body.leagueId,
    generated_by: session.user.id,
    generated_at: now,
    algorithm: "round_robin",
    constraints: {
      start_date: startDate,
      match_duration_minutes: matchDuration,
      avoid_dates: body.avoidDates || [],
    },
    matches: generatedMatches,
    status: "draft",
  };

  await db.collection("schedules").insertOne(scheduleDoc);

  // Log audit
  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp: now,
    actor_user_id: session.user.id,
    action: "SCHEDULE_GENERATED",
    entity_type: "league",
    entity_id: body.leagueId,
    metadata: {
      schedule_id: scheduleDoc._id.toString(),
      teams_count: teams.length,
      matches_count: generatedMatches.length,
      algorithm: "round_robin",
    },
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent") || "unknown",
  });

  // Return with team names for display
  const matchesWithNames = generatedMatches.map((match: any) => ({
    ...match,
    home_team_name: teams.find((t: any) => t._id.toString() === match.home_team_id)?.name || "Unknown",
    away_team_name: teams.find((t: any) => t._id.toString() === match.away_team_id)?.name || "Unknown",
  }));

  return NextResponse.json({
    schedule: {
      id: scheduleDoc._id.toString(),
      league_id: body.leagueId,
      status: "draft",
      matches: matchesWithNames,
      total_matches: generatedMatches.length,
      total_rounds: Math.ceil(generatedMatches.length / (teams.length / 2)),
    },
    message: "Schedule generated successfully. Review before publishing.",
  });
}
