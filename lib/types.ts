export type SSOProvider = "google" | "microsoft";
export type LegacyUserRole = "student" | "parent" | "admin" | "coach";
export type TenantRole =
  | "platform_admin"
  | "school_admin"
  | "sports_admin"
  | "league_admin"
  | "coach"
  | "referee"
  | "captain"
  | "participant";
export type TeamStatus = "forming" | "full" | "approved";
export type LeagueStatus = "draft" | "registration" | "active" | "completed" | "archived";
export type SchoolStatus = "trial" | "active" | "suspended" | "archived";
export type WaiverAction =
  | "WAIVER_SIGNED"
  | "TEAM_CREATED"
  | "INVITE_CREATED"
  | "ROSTER_JOINED"
  | "ROSTER_APPROVED"
  | "ROSTER_REMOVED"
  | "TEAM_APPROVED"
  | "SCORE_SUBMITTED"
  | "SCORE_APPROVED";
export type EntityType = "team" | "waiver_signature" | "registration" | "match" | "score_submission";

export interface User {
  _id: string;
  sso_provider: SSOProvider;
  sso_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: LegacyUserRole;
  school_ids?: string[];
  is_minor: boolean;
  parent_link?: string;
  created_at: string;
  updated_at: string;
}

export interface SchoolSettings {
  require_parent_waiver_for_minors: boolean;
  allow_cross_sport_participation: boolean;
  default_scoring_system_id?: string;
}

export interface School {
  _id: string;
  name: string;
  slug: string;
  domain?: string;
  school_type: "k12" | "college" | "university";
  timezone: string;
  academic_year_start: string;
  contact_email: string;
  settings: SchoolSettings;
  status: SchoolStatus;
  created_at: string;
}

export interface Sport {
  _id: string;
  name: string;
  slug: string;
  icon_url?: string;
  default_team_size_min: number;
  default_team_size_max: number;
  requires_referee: boolean;
  allows_ties: boolean;
  default_match_duration_minutes: number;
  default_scoring_system_id: string;
  metadata?: Record<string, unknown>;
}

export interface ScoringSystem {
  _id: string;
  school_id?: string | null;
  name: string;
  points: {
    win: number;
    tie: number;
    loss: number;
    forfeit_loss?: number;
    forfeit_win?: number;
  };
  tiebreakers: Array<
    | "head_to_head"
    | "point_differential"
    | "points_for"
    | "points_against_inverse"
    | "wins"
    | "quality_wins"
  >;
  allows_ties: boolean;
  uses_sets: boolean;
}

export interface RoleScope {
  sport_id?: string;
  league_id?: string;
  team_id?: string;
}

export interface RoleAssignment {
  _id: string;
  user_id: string;
  school_id: string;
  role: TenantRole;
  scope?: RoleScope;
  granted_by_user_id: string;
  granted_at: string;
  revoked_at?: string;
}

export interface League {
  _id: string;
  school_id: string;
  sport_id: string;
  scoring_system_id: string;
  name: string;
  season: string;
  division?: string;
  max_roster_size: number;
  eligibility_rules: Record<string, unknown>;
  start_date: string;
  end_date: string;
  status: LeagueStatus;
}

export interface TeamRosterMember {
  user_id: string;
  role: "player" | "manager";
  joined_at: string;
}

export interface Match {
  _id: string;
  school_id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  location: string;
  week_number?: number;
  status: "scheduled" | "in_progress" | "pending_score_approval" | "completed" | "disputed";
  created_at: string;
}

export interface Team {
  _id: string;
  school_id: string;
  league_id: string;
  name: string;
  captain_user_id: string;
  roster: TeamRosterMember[];
  status: TeamStatus;
}

export interface WaiverTemplate {
  _id: string;
  school_id: string;
  version: number;
  title: string;
  body_html: string;
  is_active: boolean;
  created_at: string;
}

export interface WaiverSignature {
  _id: string;
  school_id: string;
  user_id: string;
  waiver_template_id: string;
  league_id: string;
  signed_at: string;
  ip_address: string;
  user_agent: string;
  is_parent_signature: boolean;
  signer_user_id?: string;
  signature_hash: string;
}

export interface AuditLog {
  _id: string;
  school_id: string;
  timestamp: string;
  actor_user_id: string;
  action: WaiverAction;
  entity_type: EntityType;
  entity_id: string;
  metadata: Record<string, unknown>;
}
