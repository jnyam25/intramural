import { z } from "zod";

export const SchoolSettingsSchema = z.object({
  require_parent_waiver_for_minors: z.boolean(),
  allow_cross_sport_participation: z.boolean().default(true),
  default_scoring_system_id: z.string().length(24).optional(),
});

export const SchoolDbSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  domain: z.string().optional(),
  school_type: z.enum(["k12", "college", "university"]),
  timezone: z.string(),
  academic_year_start: z.date(),
  contact_email: z.string().email(),
  settings: SchoolSettingsSchema,
  status: z.enum(["trial", "active", "suspended", "archived"]),
  created_at: z.date(),
});

export const SportDbSchema = z.object({
  _id: z.string().optional(),
  name: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  icon_url: z.string().optional(),
  default_team_size_min: z.number().int(),
  default_team_size_max: z.number().int(),
  requires_referee: z.boolean().default(true),
  allows_ties: z.boolean(),
  default_match_duration_minutes: z.number().int(),
  default_scoring_system_id: z.string().length(24),
  metadata: z.record(z.any()).optional(),
});

export const ScoringSystemDbSchema = z.object({
  _id: z.string().optional(),
  school_id: z.string().length(24).nullable(),
  name: z.string(),
  points: z.object({
    win: z.number(),
    tie: z.number(),
    loss: z.number(),
    forfeit_loss: z.number().optional(),
    forfeit_win: z.number().optional(),
  }),
  tiebreakers: z.array(
    z.enum([
      "head_to_head",
      "point_differential",
      "points_for",
      "points_against_inverse",
      "wins",
      "quality_wins",
    ])
  ),
  allows_ties: z.boolean(),
  uses_sets: z.boolean().default(false),
});

export const RoleAssignmentDbSchema = z.object({
  _id: z.string().optional(),
  user_id: z.string().length(24),
  school_id: z.string().length(24),
  role: z.enum([
    "school_admin",
    "sports_admin",
    "league_admin",
    "coach",
    "referee",
    "captain",
    "participant",
  ]),
  scope: z
    .object({
      sport_id: z.string().length(24).optional(),
      league_id: z.string().length(24).optional(),
      team_id: z.string().length(24).optional(),
    })
    .optional(),
  granted_by_user_id: z.string().length(24),
  granted_at: z.date(),
  revoked_at: z.date().optional(),
});

export const LeagueDbSchema = z.object({
  _id: z.string().optional(),
  school_id: z.string().length(24),
  sport_id: z.string().length(24),
  scoring_system_id: z.string().length(24),
  name: z.string(),
  season: z.string(),
  division: z.string().optional(),
  max_roster_size: z.number().int(),
  eligibility_rules: z.record(z.any()),
  start_date: z.date(),
  end_date: z.date(),
  status: z.enum(["draft", "registration", "active", "completed", "archived"]),
  created_at: z.date(),
});

export type SchoolDbDocument = z.infer<typeof SchoolDbSchema>;
export type SportDbDocument = z.infer<typeof SportDbSchema>;
export type ScoringSystemDbDocument = z.infer<typeof ScoringSystemDbSchema>;
export type RoleAssignmentDbDocument = z.infer<typeof RoleAssignmentDbSchema>;
export type LeagueDbDocument = z.infer<typeof LeagueDbSchema>;
