import { z } from "zod";

export const StandingsEntryDbSchema = z.object({
  school_id: z.string(),
  league_id: z.string(),
  team_id: z.string(),
  team_name: z.string(),
  rank: z.number().int().positive(),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  forfeits: z.number().int().min(0),
  points_for: z.number(),
  points_against: z.number(),
  point_differential: z.number(),
  points: z.number(),
  games_played: z.number().int().min(0),
  win_percentage: z.number().min(0).max(1),
  last_updated: z.date(),
});

export type StandingsEntryDb = z.infer<typeof StandingsEntryDbSchema>;
