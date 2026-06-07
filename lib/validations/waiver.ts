import { z } from "zod";

// 1. API BOUNDARY SCHEMA
// What the client is allowed to send. Strict and minimal.
export const SignWaiverApiRequestSchema = z.object({
  waiverTemplateId: z.string().length(24, "Invalid waiver template ID"), // MongoDB ObjectId string
  leagueId: z.string().length(24, "Invalid league ID"),
});

export type SignWaiverApiRequest = z.infer<typeof SignWaiverApiRequestSchema>;

// 2. DATABASE BOUNDARY SCHEMA
// The exact shape of the document that will be inserted into MongoDB.
// This includes server-generated metadata for legal compliance.
export const WaiverSignatureDbSchema = z.object({
  _id: z.string().optional(),
  school_id: z.string().length(24),
  user_id: z.string().length(24),
  waiver_template_id: z.string().length(24),
  league_id: z.string().length(24),
  signed_at: z.date(),
  ip_address: z.string().ip(),
  user_agent: z.string().min(1),
  is_parent_signature: z.boolean(),
  signer_user_id: z.string().length(24),
  signature_hash: z.string().min(64),
});

export type WaiverSignatureDbDocument = z.infer<typeof WaiverSignatureDbSchema>;

// 3. AUDIT LOG SCHEMA
export const AuditLogDbSchema = z.object({
  _id: z.string().optional(),
  school_id: z.string().length(24),
  timestamp: z.date(),
  actor_user_id: z.string().length(24),
  action: z.enum([
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
  ]),
  entity_type: z.enum(["waiver_signature", "waiver_template", "team", "registration", "match", "score_submission", "league", "incident_report"]),
  entity_id: z.string().length(24),
  metadata: z.record(z.any()).optional(),
});

export type AuditLogDbDocument = z.infer<typeof AuditLogDbSchema>;