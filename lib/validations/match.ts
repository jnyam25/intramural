import { z } from "zod";

export const CreateMatchRequestSchema = z.object({
  leagueId: z.string().length(24),
  homeTeamId: z.string().length(24),
  awayTeamId: z.string().length(24),
  scheduled_at: z.string().datetime(),
  location: z.string().min(1),
  week_number: z.number().int().positive().optional(),
});

export const SubmitScoreRequestSchema = z.object({
  matchId: z.string().length(24),
  homeTeamScore: z.number().int().min(0),
  awayTeamScore: z.number().int().min(0),
});

export const ApproveScoreRequestSchema = z.object({
  matchId: z.string().length(24),
  decision: z.enum(["approve", "dispute"]),
  dispute_notes: z.string().optional(),
});

export const MatchDbSchema = z.object({
  _id: z.string().optional(),
  school_id: z.string().length(24),
  league_id: z.string().length(24),
  home_team_id: z.string().length(24),
  away_team_id: z.string().length(24),
  scheduled_at: z.date(),
  location: z.string(),
  week_number: z.number().int().optional(),
  status: z.enum(["scheduled", "in_progress", "pending_score_approval", "completed", "disputed"]),
  created_at: z.date(),
});

export const ScoreSubmissionDbSchema = z.object({
  _id: z.string().optional(),
  school_id: z.string().length(24),
  match_id: z.string().length(24),
  submitted_by_user_id: z.string().length(24),
  submitted_by_team_role: z.enum(["home", "away"]),
  home_team_score: z.number().int().min(0),
  away_team_score: z.number().int().min(0),
  submitted_at: z.date(),
  ip_address: z.string(),
  photo_url: z.string().optional(),
  status: z.enum(["pending", "approved", "disputed"]),
  admin_notes: z.string().optional(),
});
