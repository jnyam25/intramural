import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { calculateStandings } from "./calculator";
import { PointsConfig, DEFAULT_CONFIG, BASKETBALL_CONFIG } from "./types";

export const SPORT_CONFIGS: Record<string, PointsConfig> = {
  basketball: BASKETBALL_CONFIG,
  soccer: { win: 3, tie: 1, loss: 0, forfeit_loss: -1, allows_ties: true },
};

export async function updateLeagueStandings(leagueId: string, schoolId: string): Promise<void> {
  const db = await getDb();

  const league = await db.collection("leagues").findOne({
    _id: new ObjectId(leagueId),
    school_id: schoolId,
  });
  if (!league) return;

  const [matches, teams] = await Promise.all([
    db.collection("matches").find({
      league_id: leagueId,
      school_id: schoolId,
      status: { $in: ["completed", "forfeit"] },
    }).toArray(),
    db.collection("teams").find({
      league_id: leagueId,
      school_id: schoolId,
    }).toArray(),
  ]);

  const teamNames: Record<string, string> = {};
  for (const t of teams) teamNames[t._id.toString()] = t.name as string;

  const config: PointsConfig = SPORT_CONFIGS[league.sport as string] ?? DEFAULT_CONFIG;
  const standings = calculateStandings(
    matches.map((m) => ({
      home_team_id: m.home_team_id as string,
      away_team_id: m.away_team_id as string,
      home_team_score: (m.home_team_score as number) ?? 0,
      away_team_score: (m.away_team_score as number) ?? 0,
      status: m.status as "completed" | "forfeit",
      forfeit_team_role: (m.forfeit_team_role as "home" | "away") ?? null,
    })),
    teamNames,
    config
  );

  if (standings.length === 0) return;

  const now = new Date();
  const ops = standings.map((entry, idx) => ({
    replaceOne: {
      filter: { school_id: schoolId, league_id: leagueId, team_id: entry.team_id },
      replacement: {
        school_id: schoolId,
        league_id: leagueId,
        team_id: entry.team_id,
        team_name: entry.team_name,
        rank: idx + 1,
        wins: entry.wins,
        losses: entry.losses,
        ties: entry.ties,
        forfeits: entry.forfeits,
        points_for: entry.points_for,
        points_against: entry.points_against,
        point_differential: entry.point_differential,
        points: entry.points,
        games_played: entry.games_played,
        win_percentage: entry.win_percentage,
        last_updated: now,
      },
      upsert: true,
    },
  }));

  await db.collection("standings").bulkWrite(ops);
}
