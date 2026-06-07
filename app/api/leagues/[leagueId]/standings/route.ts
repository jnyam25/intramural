import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { unstable_cache } from "next/cache";
import { getScopedDb } from "@/lib/db/scoped";
import { getSession } from "@/lib/auth";
import { calculateStandings } from "@/lib/standings/calculator";
import { BASKETBALL_CONFIG, PointsConfig } from "@/lib/standings/types";

const SPORT_CONFIGS: Record<string, PointsConfig> = {
  basketball: BASKETBALL_CONFIG,
  soccer: { win: 3, tie: 1, loss: 0, forfeit_loss: -1, allows_ties: true },
};

function getCachedStandings(leagueId: string, schoolId: string) {
  return unstable_cache(
    async () => {
      const db = await getScopedDb(schoolId);
      const league = await db.collection("leagues").findOne({ _id: new ObjectId(leagueId) });
      if (!league) throw new Error("League not found");

      const matches = await db
        .collection("matches")
        .find({ league_id: leagueId, status: { $in: ["completed", "forfeit"] } })
        .toArray();

      const teams = await db.collection("teams").find({ league_id: leagueId }).toArray();

      const teamNames: Record<string, string> = {};
      for (const t of teams) {
        teamNames[t._id.toString()] = t.name;
      }

      const completedMatches = matches.map((m) => ({
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_team_score: m.home_team_score,
        away_team_score: m.away_team_score,
        status: m.status,
        forfeit_team_role: m.forfeit_team_role ?? null,
      }));

      const config =
        SPORT_CONFIGS[league.sport] ?? { win: 3, tie: 1, loss: 0, forfeit_loss: -1, allows_ties: true };

      return {
        league_name: league.name,
        sport: league.sport,
        standings: calculateStandings(completedMatches, teamNames, config),
        generated_at: new Date().toISOString(),
      };
    },
    [`league-standings-${schoolId}-${leagueId}`],
    { revalidate: 60 }
  );
}

export async function GET(req: NextRequest, { params }: { params: { leagueId: string } }) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // schoolId from header (set by middleware) or query param fallback for authenticated callers.
  const schoolId =
    req.headers.get("x-school-id") ?? req.nextUrl.searchParams.get("schoolId");

  if (!schoolId) {
    return NextResponse.json({ error: "School context required" }, { status: 400 });
  }

  try {
    const standings = await getCachedStandings(params.leagueId, schoolId)();
    return NextResponse.json(standings);
  } catch {
    return NextResponse.json({ error: "Failed to load standings" }, { status: 500 });
  }
}
