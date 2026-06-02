import { ObjectId } from "mongodb";
import { getUnencryptedDb } from "../lib/mongodb";

const DEFAULT_SCHOOL_SLUG = "pilot-school";

function mapLegacyRole(role: string) {
  switch (role) {
    case "admin":
      return "school_admin";
    case "coach":
      return "coach";
    case "student":
    case "parent":
      return "participant";
    default:
      return "participant";
  }
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function ensurePilotSchool(db: any) {
  const existing = await db.collection("schools").findOne({ slug: DEFAULT_SCHOOL_SLUG });
  if (existing) {
    return existing._id;
  }

  const pilotSchool = {
    _id: new ObjectId(),
    name: "Pilot School",
    slug: DEFAULT_SCHOOL_SLUG,
    domain: null,
    school_type: "k12",
    timezone: "America/Los_Angeles",
    academic_year_start: new Date(new Date().getFullYear(), 7, 1),
    contact_email: "pilot@intramural.example",
    settings: {
      require_parent_waiver_for_minors: true,
      allow_cross_sport_participation: true,
      default_scoring_system_id: null,
    },
    status: "trial",
    created_at: new Date(),
  };

  await db.collection("schools").insertOne(pilotSchool);
  return pilotSchool._id;
}

async function createScoringSystems(db: any) {
  const standard = {
    _id: new ObjectId(),
    school_id: null,
    name: "Standard 3-1-0",
    points: { win: 3, tie: 1, loss: 0 },
    tiebreakers: ["head_to_head", "point_differential", "points_for", "wins"],
    allows_ties: true,
    uses_sets: false,
  };

  const volleyball = {
    _id: new ObjectId(),
    school_id: null,
    name: "Volleyball Rally",
    points: { win: 3, tie: 1, loss: 0 },
    tiebreakers: ["head_to_head", "point_differential", "points_for", "wins"],
    allows_ties: false,
    uses_sets: true,
  };

  const tennis = {
    _id: new ObjectId(),
    school_id: null,
    name: "Tennis Sets",
    points: { win: 1, tie: 0, loss: 0 },
    tiebreakers: ["head_to_head", "quality_wins", "wins"],
    allows_ties: false,
    uses_sets: true,
  };

  const systems = [standard, volleyball, tennis];

  for (const system of systems) {
    await db.collection("scoring_systems").updateOne(
      { name: system.name, school_id: system.school_id },
      { $setOnInsert: system },
      { upsert: true }
    );
  }

  const resolved = await db
    .collection("scoring_systems")
    .find({ name: { $in: systems.map((item) => item.name) } })
    .toArray();

  return resolved.reduce((acc: Record<string, ObjectId>, item: any) => {
    acc[item.name] = item._id;
    return acc;
  }, {} as Record<string, ObjectId>);
}

async function createSports(db: any, defaultScoringIds: Record<string, ObjectId>) {
  const sports = [
    {
      name: "Basketball",
      slug: "basketball",
      icon_url: null,
      default_team_size_min: 5,
      default_team_size_max: 12,
      requires_referee: true,
      allows_ties: false,
      default_match_duration_minutes: 40,
      default_scoring_system_id: defaultScoringIds["Standard 3-1-0"],
      metadata: { quarter_count: 4 },
    },
    {
      name: "Soccer",
      slug: "soccer",
      icon_url: null,
      default_team_size_min: 11,
      default_team_size_max: 18,
      requires_referee: true,
      allows_ties: true,
      default_match_duration_minutes: 90,
      default_scoring_system_id: defaultScoringIds["Standard 3-1-0"],
      metadata: { half_count: 2 },
    },
    {
      name: "Ultimate Frisbee",
      slug: "ultimate-frisbee",
      icon_url: null,
      default_team_size_min: 7,
      default_team_size_max: 14,
      requires_referee: false,
      allows_ties: false,
      default_match_duration_minutes: 80,
      default_scoring_system_id: defaultScoringIds["Standard 3-1-0"],
      metadata: { point_cap: 15 },
    },
  ];

  for (const sport of sports) {
    await db.collection("sports").updateOne(
      { slug: sport.slug },
      { $set: sport },
      { upsert: true }
    );
  }
}

async function migrateLegacyLeagues(db: any, defaultScoringIds: Record<string, ObjectId>) {
  const leagues = await db.collection("leagues").find().toArray();
  for (const league of leagues) {
    if (!league.scoring_system_id) {
      const sportKey = String(league.sport || "").trim().toLowerCase();
      let scoring_system_id = defaultScoringIds["Standard 3-1-0"];
      if (sportKey === "volleyball") {
        scoring_system_id = defaultScoringIds["Volleyball Rally"];
      } else if (sportKey === "tennis") {
        scoring_system_id = defaultScoringIds["Tennis Sets"];
      }

      await db.collection("leagues").updateOne(
        { _id: league._id },
        { $set: { scoring_system_id } }
      );
    }
  }
}

async function backfillSchoolId(db: any, schoolId: ObjectId) {
  const tenantCollections = [
    "users",
    "leagues",
    "teams",
    "matches",
    "waiver_templates",
    "waiver_signatures",
    "score_submissions",
    "team_invites",
    "audit_logs",
    "role_assignments",
  ];

  for (const collection of tenantCollections) {
    await db.collection(collection).updateMany(
      { school_id: { $exists: false } },
      { $set: { school_id: schoolId } }
    );
  }
}

async function createRoleAssignments(db: any, schoolId: ObjectId) {
  const users = await db.collection("users").find().toArray();
  const assignments = users
    .map((user: any) => {
      if (!user.role) return null;
      const role = mapLegacyRole(user.role);
      return {
        _id: new ObjectId(),
        user_id: user._id,
        school_id: schoolId,
        role,
        scope: {},
        granted_by_user_id: user._id,
        granted_at: new Date(),
      };
    })
    .filter(Boolean);

  if (assignments.length) {
    await db.collection("role_assignments").insertMany(assignments);
  }
}

async function addSchoolIdsToUsers(db: any, schoolId: ObjectId) {
  await db.collection("users").updateMany(
    { school_ids: { $exists: false } },
    { $set: { school_ids: [schoolId] } }
  );
}

async function createTenantIndexes(db: any) {
  await db.collection("users").createIndex({ school_id: 1, email: 1 });
  await db.collection("users").createIndex({ school_id: 1, sso_id: 1 });

  await db.collection("leagues").createIndex({ school_id: 1, sport_id: 1 });
  await db.collection("leagues").createIndex({ school_id: 1, status: 1 });

  await db.collection("teams").createIndex({ school_id: 1, league_id: 1 });
  await db.collection("teams").createIndex({ school_id: 1, "roster.user_id": 1 });

  await db.collection("matches").createIndex({ school_id: 1, league_id: 1 });
  await db.collection("matches").createIndex({ school_id: 1, scheduled_at: -1 });

  await db.collection("waiver_templates").createIndex({ school_id: 1, is_active: 1 });
  await db.collection("waiver_signatures").createIndex({ school_id: 1, user_id: 1 });
  await db.collection("waiver_signatures").createIndex({ school_id: 1, league_id: 1 });

  await db.collection("score_submissions").createIndex({ school_id: 1, match_id: 1 });
  await db.collection("score_submissions").createIndex({ school_id: 1, submitted_by_user_id: 1 });

  await db.collection("team_invites").createIndex({ school_id: 1, team_id: 1 });
  await db.collection("team_invites").createIndex({ school_id: 1, expires_at: 1 });

  await db.collection("role_assignments").createIndex({ user_id: 1, school_id: 1, revoked_at: 1 });

  await db.collection("audit_logs").createIndex({ school_id: 1, timestamp: -1 });
  await db.collection("scoring_systems").createIndex({ school_id: 1, name: 1 });
}

async function run() {
  const db = await getUnencryptedDb();

  console.log("Starting multi-tenant migration...");

  const pilotSchoolId = await ensurePilotSchool(db);
  console.log("Pilot school id:", pilotSchoolId.toHexString());

  await backfillSchoolId(db, pilotSchoolId);
  await addSchoolIdsToUsers(db, pilotSchoolId);
  await createRoleAssignments(db, pilotSchoolId);

  const scoringIds = await createScoringSystems(db);
  await createSports(db, scoringIds);
  await migrateLegacyLeagues(db, scoringIds);

  await createTenantIndexes(db);

  console.log("Migration complete. Tenant indexes created.");
  process.exit(0);
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
