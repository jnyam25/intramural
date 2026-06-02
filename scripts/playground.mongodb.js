// MongoDB Playground — Intramural Sports Platform
// Run with: MongoDB for VS Code extension, or mongosh playground.mongodb.js
// Connection: configure your Atlas/local URI in the VS Code extension settings

use("intramural");

// ─── Sports ──────────────────────────────────────────────────────────────────

db.sports.drop();
db.sports.insertMany([
  {
    _id: "sport_basketball",
    name: "Basketball",
    slug: "basketball",
    default_team_size_min: 5,
    default_team_size_max: 10,
    requires_referee: true,
    allows_ties: false,
    default_match_duration_minutes: 40,
    default_scoring_system_id: "scoring_standard_wl",
  },
  {
    _id: "sport_volleyball",
    name: "Volleyball",
    slug: "volleyball",
    default_team_size_min: 6,
    default_team_size_max: 12,
    requires_referee: true,
    allows_ties: false,
    default_match_duration_minutes: 60,
    default_scoring_system_id: "scoring_standard_wl",
  },
  {
    _id: "sport_flag_football",
    name: "Flag Football",
    slug: "flag-football",
    default_team_size_min: 7,
    default_team_size_max: 14,
    requires_referee: false,
    allows_ties: true,
    default_match_duration_minutes: 50,
    default_scoring_system_id: "scoring_wlt",
  },
]);

// ─── Scoring Systems ─────────────────────────────────────────────────────────

db.scoring_systems.drop();
db.scoring_systems.insertMany([
  {
    _id: "scoring_standard_wl",
    school_id: null,
    name: "Standard Win/Loss",
    points: { win: 3, tie: 0, loss: 0, forfeit_loss: 0, forfeit_win: 3 },
    tiebreakers: ["head_to_head", "point_differential", "points_for"],
    allows_ties: false,
    uses_sets: false,
  },
  {
    _id: "scoring_wlt",
    school_id: null,
    name: "Win/Loss/Tie",
    points: { win: 3, tie: 1, loss: 0, forfeit_loss: 0, forfeit_win: 3 },
    tiebreakers: ["head_to_head", "point_differential", "points_for"],
    allows_ties: true,
    uses_sets: false,
  },
  {
    _id: "scoring_volleyball_sets",
    school_id: "school_riverside",
    name: "Volleyball Sets",
    points: { win: 3, tie: 0, loss: 0 },
    tiebreakers: ["head_to_head", "points_for"],
    allows_ties: false,
    uses_sets: true,
  },
]);

// ─── Schools ─────────────────────────────────────────────────────────────────

db.schools.drop();
db.schools.insertMany([
  {
    _id: "school_riverside",
    name: "Riverside High School",
    slug: "riverside-high",
    domain: "riverside.edu",
    school_type: "k12",
    timezone: "America/Chicago",
    academic_year_start: "2025-08-15",
    contact_email: "athletics@riverside.edu",
    settings: {
      require_parent_waiver_for_minors: true,
      allow_cross_sport_participation: true,
      default_scoring_system_id: "scoring_standard_wl",
    },
    status: "active",
    created_at: new Date("2025-08-01"),
  },
  {
    _id: "school_summit",
    name: "Summit Academy",
    slug: "summit-academy",
    domain: "summit.edu",
    school_type: "k12",
    timezone: "America/Denver",
    academic_year_start: "2025-08-20",
    contact_email: "sports@summit.edu",
    settings: {
      require_parent_waiver_for_minors: true,
      allow_cross_sport_participation: false,
      default_scoring_system_id: "scoring_standard_wl",
    },
    status: "active",
    created_at: new Date("2025-09-01"),
  },
  {
    _id: "school_trial",
    name: "Trailblazer Charter School",
    slug: "trailblazer-charter",
    school_type: "k12",
    timezone: "America/Los_Angeles",
    academic_year_start: "2025-09-05",
    contact_email: "admin@trailblazer.edu",
    settings: {
      require_parent_waiver_for_minors: false,
      allow_cross_sport_participation: true,
    },
    status: "trial",
    created_at: new Date("2026-01-15"),
  },
]);

// ─── Users ───────────────────────────────────────────────────────────────────

db.users.drop();
db.users.insertMany([
  {
    _id: "user_admin_riverside",
    sso_provider: "google",
    sso_id: "google_1001",
    email: "jsmith@riverside.edu",
    first_name: "James",
    last_name: "Smith",
    role: "admin",
    school_ids: ["school_riverside"],
    is_minor: false,
    created_at: new Date("2025-08-01"),
    updated_at: new Date("2025-08-01"),
  },
  {
    _id: "user_coach_01",
    sso_provider: "google",
    sso_id: "google_1002",
    email: "coach.kim@riverside.edu",
    first_name: "Angela",
    last_name: "Kim",
    role: "coach",
    school_ids: ["school_riverside"],
    is_minor: false,
    created_at: new Date("2025-08-05"),
    updated_at: new Date("2025-08-05"),
  },
  {
    _id: "user_captain_01",
    sso_provider: "microsoft",
    sso_id: "ms_2001",
    email: "t.johnson@students.riverside.edu",
    first_name: "Tyler",
    last_name: "Johnson",
    role: "student",
    school_ids: ["school_riverside"],
    is_minor: true,
    parent_link: "user_parent_01",
    created_at: new Date("2025-09-01"),
    updated_at: new Date("2025-09-01"),
  },
  {
    _id: "user_parent_01",
    sso_provider: "google",
    sso_id: "google_3001",
    email: "mjohnson@gmail.com",
    first_name: "Mark",
    last_name: "Johnson",
    role: "parent",
    is_minor: false,
    created_at: new Date("2025-09-01"),
    updated_at: new Date("2025-09-01"),
  },
  {
    _id: "user_player_02",
    sso_provider: "microsoft",
    sso_id: "ms_2002",
    email: "a.patel@students.riverside.edu",
    first_name: "Aisha",
    last_name: "Patel",
    role: "student",
    school_ids: ["school_riverside"],
    is_minor: true,
    parent_link: "user_parent_02",
    created_at: new Date("2025-09-02"),
    updated_at: new Date("2025-09-02"),
  },
  {
    _id: "user_parent_02",
    sso_provider: "google",
    sso_id: "google_3002",
    email: "rpatel@gmail.com",
    first_name: "Raj",
    last_name: "Patel",
    role: "parent",
    is_minor: false,
    created_at: new Date("2025-09-02"),
    updated_at: new Date("2025-09-02"),
  },
  {
    _id: "user_player_03",
    sso_provider: "google",
    sso_id: "google_2003",
    email: "m.chen@students.riverside.edu",
    first_name: "Marcus",
    last_name: "Chen",
    role: "student",
    school_ids: ["school_riverside"],
    is_minor: true,
    created_at: new Date("2025-09-03"),
    updated_at: new Date("2025-09-03"),
  },
  {
    _id: "user_referee_01",
    sso_provider: "google",
    sso_id: "google_4001",
    email: "ref.davis@riverside.edu",
    first_name: "Sam",
    last_name: "Davis",
    role: "admin",
    school_ids: ["school_riverside"],
    is_minor: false,
    created_at: new Date("2025-08-10"),
    updated_at: new Date("2025-08-10"),
  },
]);

// ─── Role Assignments ─────────────────────────────────────────────────────────

db.role_assignments.drop();
db.role_assignments.insertMany([
  {
    _id: "role_admin_riverside",
    user_id: "user_admin_riverside",
    school_id: "school_riverside",
    role: "school_admin",
    granted_by_user_id: "user_admin_riverside",
    granted_at: new Date("2025-08-01"),
  },
  {
    _id: "role_coach_basketball",
    user_id: "user_coach_01",
    school_id: "school_riverside",
    role: "coach",
    scope: { sport_id: "sport_basketball", league_id: "league_basketball_fall25" },
    granted_by_user_id: "user_admin_riverside",
    granted_at: new Date("2025-08-15"),
  },
  {
    _id: "role_captain_01",
    user_id: "user_captain_01",
    school_id: "school_riverside",
    role: "captain",
    scope: { team_id: "team_dunkers" },
    granted_by_user_id: "user_admin_riverside",
    granted_at: new Date("2025-09-10"),
  },
  {
    _id: "role_referee_01",
    user_id: "user_referee_01",
    school_id: "school_riverside",
    role: "referee",
    scope: { league_id: "league_basketball_fall25" },
    granted_by_user_id: "user_admin_riverside",
    granted_at: new Date("2025-08-20"),
  },
]);

// ─── Leagues ─────────────────────────────────────────────────────────────────

db.leagues.drop();
db.leagues.insertMany([
  {
    _id: "league_basketball_fall25",
    school_id: "school_riverside",
    sport_id: "sport_basketball",
    scoring_system_id: "scoring_standard_wl",
    name: "Fall Basketball League 2025",
    season: "Fall 2025",
    division: "JV",
    max_roster_size: 10,
    eligibility_rules: { min_gpa: 2.0, grade_levels: [9, 10, 11, 12] },
    start_date: new Date("2025-09-15"),
    end_date: new Date("2025-12-01"),
    status: "active",
  },
  {
    _id: "league_volleyball_spring26",
    school_id: "school_riverside",
    sport_id: "sport_volleyball",
    scoring_system_id: "scoring_volleyball_sets",
    name: "Spring Volleyball League 2026",
    season: "Spring 2026",
    max_roster_size: 12,
    eligibility_rules: { grade_levels: [9, 10, 11, 12] },
    start_date: new Date("2026-02-01"),
    end_date: new Date("2026-05-15"),
    status: "registration",
  },
  {
    _id: "league_flagfootball_fall25",
    school_id: "school_riverside",
    sport_id: "sport_flag_football",
    scoring_system_id: "scoring_wlt",
    name: "Fall Flag Football 2025",
    season: "Fall 2025",
    max_roster_size: 14,
    eligibility_rules: {},
    start_date: new Date("2025-09-20"),
    end_date: new Date("2025-11-15"),
    status: "completed",
  },
]);

// ─── Teams ────────────────────────────────────────────────────────────────────

db.teams.drop();
db.teams.insertMany([
  {
    _id: "team_dunkers",
    school_id: "school_riverside",
    league_id: "league_basketball_fall25",
    name: "The Dunkers",
    captain_user_id: "user_captain_01",
    roster: [
      { user_id: "user_captain_01", role: "player", joined_at: new Date("2025-09-05") },
      { user_id: "user_player_02",  role: "player", joined_at: new Date("2025-09-06") },
      { user_id: "user_player_03",  role: "player", joined_at: new Date("2025-09-07") },
    ],
    status: "approved",
  },
  {
    _id: "team_fastbreak",
    school_id: "school_riverside",
    league_id: "league_basketball_fall25",
    name: "Fast Break FC",
    captain_user_id: "user_player_02",
    roster: [
      { user_id: "user_player_02", role: "player", joined_at: new Date("2025-09-08") },
    ],
    status: "forming",
  },
  {
    _id: "team_spikes",
    school_id: "school_riverside",
    league_id: "league_volleyball_spring26",
    name: "The Spikes",
    captain_user_id: "user_captain_01",
    roster: [
      { user_id: "user_captain_01", role: "player", joined_at: new Date("2026-01-20") },
      { user_id: "user_player_03",  role: "player", joined_at: new Date("2026-01-21") },
    ],
    status: "approved",
  },
]);

// ─── Matches ──────────────────────────────────────────────────────────────────

db.matches.drop();
db.matches.insertMany([
  {
    _id: "match_bball_wk1_01",
    school_id: "school_riverside",
    league_id: "league_basketball_fall25",
    home_team_id: "team_dunkers",
    away_team_id: "team_fastbreak",
    scheduled_at: new Date("2025-09-20T14:00:00Z"),
    location: "Gym A",
    week_number: 1,
    status: "completed",
    created_at: new Date("2025-09-15"),
  },
  {
    _id: "match_bball_wk2_01",
    school_id: "school_riverside",
    league_id: "league_basketball_fall25",
    home_team_id: "team_fastbreak",
    away_team_id: "team_dunkers",
    scheduled_at: new Date("2025-09-27T14:00:00Z"),
    location: "Gym B",
    week_number: 2,
    status: "scheduled",
    created_at: new Date("2025-09-15"),
  },
  {
    _id: "match_bball_pending",
    school_id: "school_riverside",
    league_id: "league_basketball_fall25",
    home_team_id: "team_dunkers",
    away_team_id: "team_fastbreak",
    scheduled_at: new Date("2025-10-04T14:00:00Z"),
    location: "Gym A",
    week_number: 3,
    status: "pending_score_approval",
    created_at: new Date("2025-09-15"),
  },
]);

// ─── Waiver Templates ─────────────────────────────────────────────────────────

db.waiver_templates.drop();
db.waiver_templates.insertOne({
  _id: "waiver_riverside_v1",
  school_id: "school_riverside",
  version: 1,
  title: "Intramural Sports Participation Waiver",
  body_html: "<p>I acknowledge the risks associated with intramural sports participation...</p>",
  is_active: true,
  created_at: new Date("2025-08-01"),
});

// ─── Waiver Signatures ────────────────────────────────────────────────────────

db.waiver_signatures.drop();
db.waiver_signatures.insertMany([
  {
    _id: "sig_captain01_bball",
    school_id: "school_riverside",
    user_id: "user_captain_01",
    waiver_template_id: "waiver_riverside_v1",
    league_id: "league_basketball_fall25",
    signed_at: new Date("2025-09-04T10:00:00Z"),
    ip_address: "192.168.1.10",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    is_parent_signature: false,
    signer_user_id: "user_captain_01",
    signature_hash: "sha256_abc123",
  },
  {
    _id: "sig_parent01_bball",
    school_id: "school_riverside",
    user_id: "user_captain_01",
    waiver_template_id: "waiver_riverside_v1",
    league_id: "league_basketball_fall25",
    signed_at: new Date("2025-09-04T18:30:00Z"),
    ip_address: "10.0.0.42",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
    is_parent_signature: true,
    signer_user_id: "user_parent_01",
    signature_hash: "sha256_def456",
  },
]);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

db.audit_logs.drop();
db.audit_logs.insertMany([
  {
    _id: "audit_01",
    school_id: "school_riverside",
    timestamp: new Date("2025-09-04T10:00:00Z"),
    actor_user_id: "user_captain_01",
    action: "WAIVER_SIGNED",
    entity_type: "waiver_signature",
    entity_id: "sig_captain01_bball",
    metadata: { league_id: "league_basketball_fall25" },
  },
  {
    _id: "audit_02",
    school_id: "school_riverside",
    timestamp: new Date("2025-09-05T09:15:00Z"),
    actor_user_id: "user_captain_01",
    action: "TEAM_CREATED",
    entity_type: "team",
    entity_id: "team_dunkers",
    metadata: { league_id: "league_basketball_fall25" },
  },
  {
    _id: "audit_03",
    school_id: "school_riverside",
    timestamp: new Date("2025-09-06T11:00:00Z"),
    actor_user_id: "user_player_02",
    action: "ROSTER_JOINED",
    entity_type: "team",
    entity_id: "team_dunkers",
    metadata: { invited_by: "user_captain_01" },
  },
  {
    _id: "audit_04",
    school_id: "school_riverside",
    timestamp: new Date("2025-09-20T16:10:00Z"),
    actor_user_id: "user_referee_01",
    action: "SCORE_SUBMITTED",
    entity_type: "match",
    entity_id: "match_bball_wk1_01",
    metadata: { home_score: 42, away_score: 35 },
  },
]);

// ─── Sample Queries ───────────────────────────────────────────────────────────

// All approved teams in the basketball league with their roster size
db.teams.aggregate([
  { $match: { league_id: "league_basketball_fall25", status: "approved" } },
  { $addFields: { roster_count: { $size: "$roster" } } },
  { $project: { name: 1, status: 1, captain_user_id: 1, roster_count: 1 } },
]);

// Upcoming scheduled matches for Riverside (next 30 days)
db.matches.find({
  school_id: "school_riverside",
  status: "scheduled",
  scheduled_at: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
});

// Active leagues with sport info (lookup)
db.leagues.aggregate([
  { $match: { school_id: "school_riverside", status: "active" } },
  {
    $lookup: {
      from: "sports",
      localField: "sport_id",
      foreignField: "_id",
      as: "sport",
    },
  },
  { $unwind: "$sport" },
  { $project: { name: 1, season: 1, status: 1, "sport.name": 1, start_date: 1, end_date: 1 } },
]);

// Players who have NOT signed the waiver for the basketball league
db.teams.aggregate([
  { $match: { league_id: "league_basketball_fall25" } },
  { $unwind: "$roster" },
  {
    $lookup: {
      from: "waiver_signatures",
      let: { uid: "$roster.user_id" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$user_id", "$$uid"] },
                { $eq: ["$league_id", "league_basketball_fall25"] },
                { $eq: ["$is_parent_signature", false] },
              ],
            },
          },
        },
      ],
      as: "signatures",
    },
  },
  { $match: { signatures: { $size: 0 } } },
  { $project: { "roster.user_id": 1, _id: 0 } },
]);

// Audit log: all actions on the basketball league, most recent first
db.audit_logs
  .find({ school_id: "school_riverside", "metadata.league_id": "league_basketball_fall25" })
  .sort({ timestamp: -1 });
