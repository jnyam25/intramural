import { z } from "zod";

// --- API BOUNDARY SCHEMAS ---
export const CreateTeamRequestSchema = z.object({
  leagueId: z.string().length(24),
  name: z.string().min(2).max(50),
});

export const JoinTeamRequestSchema = z.object({
  token: z.string().min(32).max(128),
});

export const ApproveRosterMemberSchema = z.object({
  teamId: z.string().length(24),
  userId: z.string().length(24),
  action: z.enum(["approve", "remove"]),
});

// --- DATABASE SCHEMAS ---
export const TeamInviteDbSchema = z.object({
  _id: z.string().optional(),
  school_id: z.string().length(24),
  team_id: z.string().length(24),
  league_id: z.string().length(24),
  token: z.string().min(32),
  created_by_user_id: z.string().length(24),
  expires_at: z.date(),
  max_uses: z.number().int().positive(),
  use_count: z.number().int().default(0),
  is_revoked: z.boolean().default(false),
  created_at: z.date(),
});

export type TeamInviteDbDocument = z.infer<typeof TeamInviteDbSchema>;

export const AuditActionEnum = z.enum([
  "WAIVER_SIGNED",
  "WAIVER_TEMPLATE_CREATED",
  "TEAM_CREATED",
  "INVITE_CREATED",
  "ROSTER_JOINED",
  "ROSTER_APPROVED",
  "ROSTER_REMOVED",
  "TEAM_APPROVED",
  "TEAM_REJECTED",
  "TEAM_DISBANDED",
  "SCORE_SUBMITTED",
  "SCORE_APPROVED",
  "LEAGUE_CREATED",
  "LEAGUE_UPDATED",
  "MATCH_RESCHEDULED",
  "MATCH_CANCELLED",
  "INCIDENT_REPORTED",
]);

export type AuditAction = z.infer<typeof AuditActionEnum>;
