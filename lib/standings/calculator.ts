import { PointsConfig, DEFAULT_CONFIG } from "./types";

interface CompletedMatch {
  home_team_id: string;
  away_team_id: string;
  home_team_score: number;
  away_team_score: number;
  status: "completed" | "forfeit";
  forfeit_team_role?: "home" | "away" | null;
}

export interface TeamStanding {
  team_id: string;
  team_name: string;
  wins: number;
  losses: number;
  ties: number;
  forfeits: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  points: number;
  games_played: number;
  win_percentage: number;
}

export function calculateStandings(
  matches: CompletedMatch[],
  teamNames: Record<string, string>,
  config: PointsConfig = DEFAULT_CONFIG
): TeamStanding[] {
  const standingsMap = new Map<string, TeamStanding>();

  const getOrCreate = (teamId: string): TeamStanding => {
    if (!standingsMap.has(teamId)) {
      standingsMap.set(teamId, {
        team_id: teamId,
        team_name: teamNames[teamId] || "Unknown",
        wins: 0,
        losses: 0,
        ties: 0,
        forfeits: 0,
        points_for: 0,
        points_against: 0,
        point_differential: 0,
        points: 0,
        games_played: 0,
        win_percentage: 0,
      });
    }
    return standingsMap.get(teamId)!;
  };

  for (const match of matches) {
    if (match.status !== "completed" && match.status !== "forfeit") continue;

    const home = getOrCreate(match.home_team_id);
    const away = getOrCreate(match.away_team_id);

    home.points_for += match.home_team_score;
    home.points_against += match.away_team_score;
    away.points_for += match.away_team_score;
    away.points_against += match.home_team_score;

    home.games_played++;
    away.games_played++;

    if (match.status === "forfeit") {
      const forfeiter = match.forfeit_team_role === "home" ? home : away;
      const winner = match.forfeit_team_role === "home" ? away : home;
      forfeiter.forfeits++;
      forfeiter.losses++;
      forfeiter.points += config.forfeit_loss;
      winner.wins++;
      winner.points += config.win;
      continue;
    }

    if (match.home_team_score > match.away_team_score) {
      home.wins++;
      home.points += config.win;
      away.losses++;
      away.points += config.loss;
    } else if (match.home_team_score < match.away_team_score) {
      away.wins++;
      away.points += config.win;
      home.losses++;
      home.points += config.loss;
    } else if (config.allows_ties) {
      home.ties++;
      home.points += config.tie;
      away.ties++;
      away.points += config.tie;
    }
  }

  for (const standing of standingsMap.values()) {
    standing.point_differential = standing.points_for - standing.points_against;
    standing.win_percentage = standing.games_played > 0
      ? (standing.wins + standing.ties * 0.5) / standing.games_played
      : 0;
  }

  return Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.win_percentage !== a.win_percentage) return b.win_percentage - a.win_percentage;
    if (b.point_differential !== a.point_differential) return b.point_differential - a.point_differential;
    return b.points_for - a.points_for;
  });
}
