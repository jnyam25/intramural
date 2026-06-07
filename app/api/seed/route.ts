import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";

// Test credentials for different user types
const TEST_USERS = [
  {
    type: "participant",
    email: "participant@test.intramural",
    password: "TestPass123!",
    firstName: "Alex",
    lastName: "Participant",
    role: "participant",
    description: "Regular student participant - can join teams and view leagues",
  },
  {
    type: "captain",
    email: "captain@test.intramural",
    password: "TestPass123!",
    firstName: "Jordan",
    lastName: "Captain",
    role: "captain",
    description: "Team captain - can manage team roster and schedule matches",
  },
  {
    type: "coach",
    email: "coach@test.intramural",
    password: "TestPass123!",
    firstName: "Riley",
    lastName: "Coach",
    role: "coach",
    description: "Team coach - manages roster and communications",
  },
  {
    type: "referee",
    email: "referee@test.intramural",
    password: "TestPass123!",
    firstName: "Sam",
    lastName: "Referee",
    role: "referee",
    description: "Game official - submits scores and files incident reports",
  },
  {
    type: "sports_admin",
    email: "sportsadmin@test.intramural",
    password: "TestPass123!",
    firstName: "Casey",
    lastName: "SportsAdmin",
    role: "sports_admin",
    description: "Sports coordinator - manages all leagues and matches for their assigned sport",
  },
  {
    type: "league_admin",
    email: "leagueadmin@test.intramural",
    password: "TestPass123!",
    firstName: "Morgan",
    lastName: "LeagueAdmin",
    role: "league_admin",
    description: "League administrator - manages a specific league",
  },
  {
    type: "school_admin",
    email: "schooladmin@test.intramural",
    password: "TestPass123!",
    firstName: "Taylor",
    lastName: "SchoolAdmin",
    role: "school_admin",
    description: "School administrator - full access to school settings, roles, and reports",
  },
];

// ---------------------------------------------------------------------------
// Scoring systems (school_id = null → available to all schools)
// ---------------------------------------------------------------------------
const SCORING_SYSTEMS = [
  {
    name: "Basketball — Standard",
    points: { win: 2, tie: 0, loss: 0, forfeit_loss: 0, forfeit_win: 2 },
    tiebreakers: ["head_to_head", "point_differential", "points_for"],
    allows_ties: false,
    uses_sets: false,
    slug: "basketball-standard",
  },
  {
    name: "Soccer — Standard",
    points: { win: 3, tie: 1, loss: 0, forfeit_loss: -1, forfeit_win: 3 },
    tiebreakers: ["head_to_head", "point_differential", "points_for"],
    allows_ties: true,
    uses_sets: false,
    slug: "soccer-standard",
  },
  {
    name: "Volleyball — Standard",
    points: { win: 3, tie: 0, loss: 0, forfeit_loss: 0, forfeit_win: 3 },
    tiebreakers: ["head_to_head", "wins", "point_differential"],
    allows_ties: false,
    uses_sets: true,
    slug: "volleyball-standard",
  },
  {
    name: "Flag Football — Standard",
    points: { win: 2, tie: 1, loss: 0, forfeit_loss: 0, forfeit_win: 2 },
    tiebreakers: ["head_to_head", "point_differential", "points_for"],
    allows_ties: true,
    uses_sets: false,
    slug: "flag-football-standard",
  },
];

// ---------------------------------------------------------------------------
// Sports (seeded as school-specific; scoring system refs resolved at runtime)
// ---------------------------------------------------------------------------
const SPORT_DEFINITIONS = [
  {
    name: "Basketball",
    slug: "basketball",
    description: "5-on-5 half-court basketball. Two 20-minute halves.",
    default_team_size_min: 5,
    default_team_size_max: 10,
    requires_referee: true,
    allows_ties: false,
    default_match_duration_minutes: 40,
    equipment_requirements: ["Basketball", "Athletic shoes"],
    scoringSystemSlug: "basketball-standard",
  },
  {
    name: "Soccer",
    slug: "soccer",
    description: "7-on-7 outdoor soccer. Two 25-minute halves.",
    default_team_size_min: 7,
    default_team_size_max: 14,
    requires_referee: true,
    allows_ties: true,
    default_match_duration_minutes: 50,
    equipment_requirements: ["Soccer ball", "Cleats or athletic shoes"],
    scoringSystemSlug: "soccer-standard",
  },
  {
    name: "Volleyball",
    slug: "volleyball",
    description: "6-on-6 indoor volleyball. Best of 3 sets.",
    default_team_size_min: 6,
    default_team_size_max: 12,
    requires_referee: true,
    allows_ties: false,
    default_match_duration_minutes: 60,
    equipment_requirements: ["Volleyball", "Athletic shoes (non-marking)"],
    scoringSystemSlug: "volleyball-standard",
  },
  {
    name: "Flag Football",
    slug: "flag-football",
    description: "7-on-7 flag football. Two 20-minute halves.",
    default_team_size_min: 7,
    default_team_size_max: 12,
    requires_referee: true,
    allows_ties: true,
    default_match_duration_minutes: 40,
    equipment_requirements: ["Flags", "Football", "Athletic shoes"],
    scoringSystemSlug: "flag-football-standard",
  },
];

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seeding not allowed in production" }, { status: 403 });
  }

  try {
    const db = await getDb();
    const now = new Date();

    // -----------------------------------------------------------------------
    // 1. School
    // -----------------------------------------------------------------------
    let school = await db.collection("schools").findOne({ slug: "test-university" });
    if (!school) {
      const doc = {
        _id: new ObjectId(),
        name: "Test University",
        slug: "test-university",
        domain: "test.intramural",
        school_type: "university",
        timezone: "America/New_York",
        academic_year_start: new Date(new Date().getFullYear(), 7, 1),
        contact_email: "admin@test.intramural",
        settings: {
          require_parent_waiver_for_minors: false,
          allow_cross_sport_participation: true,
        },
        status: "active",
        created_at: now,
      };
      await db.collection("schools").insertOne(doc);
      school = doc;
    }
    const schoolId = school._id.toString();

    // -----------------------------------------------------------------------
    // 2. Scoring systems
    // -----------------------------------------------------------------------
    const scoringSystemIds: Record<string, ObjectId> = {};
    for (const ss of SCORING_SYSTEMS) {
      let existing = await db.collection("scoring_systems").findOne({ slug: ss.slug });
      if (!existing) {
        const doc = {
          _id: new ObjectId(),
          school_id: null,
          name: ss.name,
          slug: ss.slug,
          points: ss.points,
          tiebreakers: ss.tiebreakers,
          allows_ties: ss.allows_ties,
          uses_sets: ss.uses_sets,
          created_at: now,
        };
        await db.collection("scoring_systems").insertOne(doc);
        existing = doc;
      }
      scoringSystemIds[ss.slug] = existing._id;
    }

    // -----------------------------------------------------------------------
    // 3. Sports
    // -----------------------------------------------------------------------
    const sportIds: Record<string, ObjectId> = {};
    for (const sp of SPORT_DEFINITIONS) {
      let existing = await db.collection("sports").findOne({ slug: sp.slug, school_id: schoolId });
      if (!existing) {
        const doc = {
          _id: new ObjectId(),
          school_id: schoolId,
          name: sp.name,
          slug: sp.slug,
          description: sp.description,
          default_team_size_min: sp.default_team_size_min,
          default_team_size_max: sp.default_team_size_max,
          requires_referee: sp.requires_referee,
          allows_ties: sp.allows_ties,
          default_match_duration_minutes: sp.default_match_duration_minutes,
          default_scoring_system_id: scoringSystemIds[sp.scoringSystemSlug].toString(),
          equipment_requirements: sp.equipment_requirements,
          is_active: true,
          created_at: now,
        };
        await db.collection("sports").insertOne(doc);
        existing = doc;
      }
      sportIds[sp.slug] = existing._id;
    }

    // -----------------------------------------------------------------------
    // 4. Users + role assignments
    // -----------------------------------------------------------------------
    const results: Array<{ type: string; email: string; status: string; userId?: string }> = [];

    for (const userConfig of TEST_USERS) {
      const existing = await db.collection("users").findOne({ email: userConfig.email });
      let userId: ObjectId;

      if (existing) {
        userId = existing._id;
        results.push({ type: userConfig.type, email: userConfig.email, status: "already exists", userId: userId.toString() });
      } else {
        const passwordHash = await bcrypt.hash(userConfig.password, 12);
        const doc = {
          _id: new ObjectId(),
          name: `${userConfig.firstName} ${userConfig.lastName}`,
          email: userConfig.email,
          emailVerified: now,
          sso_provider: "credentials",
          sso_id: null,
          first_name: userConfig.firstName,
          last_name: userConfig.lastName,
          password_hash: passwordHash,
          role: "student",
          is_minor: false,
          school_ids: [school._id],
          created_at: now,
          updated_at: now,
        };
        const res = await db.collection("users").insertOne(doc);
        userId = res.insertedId as ObjectId;
        results.push({ type: userConfig.type, email: userConfig.email, status: "created", userId: userId.toString() });
      }

      // Build scope: sports_admin gets basketball scope, league_admin gets no default scope
      let scope: Record<string, string | undefined> = {};
      if (userConfig.role === "sports_admin") {
        scope = { sport_id: sportIds["basketball"].toString() };
      }

      const existingAssignment = await db.collection("role_assignments").findOne({
        user_id: userId.toString(),
        school_id: school._id,
        role: userConfig.role,
        revoked_at: { $exists: false },
      });

      if (!existingAssignment) {
        await db.collection("role_assignments").insertOne({
          _id: new ObjectId(),
          user_id: userId.toString(),
          school_id: school._id,
          role: userConfig.role,
          scope,
          granted_by_user_id: userId.toString(),
          granted_at: now,
        });
      }
    }

    // -----------------------------------------------------------------------
    // 5. Test league (Basketball, linked to real sport + scoring system)
    // -----------------------------------------------------------------------
    const existingLeague = await db.collection("leagues").findOne({ name: "Test Basketball League" });
    if (!existingLeague) {
      await db.collection("leagues").insertOne({
        _id: new ObjectId(),
        name: "Test Basketball League",
        school_id: schoolId,
        sport_id: sportIds["basketball"].toString(),
        scoring_system_id: scoringSystemIds["basketball-standard"].toString(),
        sport: "basketball",
        season: "Fall 2025",
        division: "Co-Ed",
        max_roster_size: 10,
        eligibility_rules: {},
        start_date: new Date(2025, 8, 1),
        end_date: new Date(2025, 11, 15),
        status: "active",
        settings: { max_teams: 12, playoff_teams: 4, require_waiver: true },
        created_at: now,
      });
    }

    // -----------------------------------------------------------------------
    // 6. Test team for captain
    // -----------------------------------------------------------------------
    const captainResult = results.find((r) => r.type === "captain");
    if (captainResult?.userId) {
      const existingTeam = await db.collection("teams").findOne({ captain_user_id: captainResult.userId });
      if (!existingTeam) {
        await db.collection("teams").insertOne({
          _id: new ObjectId(),
          name: "Test Thunderbolts",
          school_id: schoolId,
          league_id: null,
          captain_user_id: captainResult.userId,
          roster: [{ user_id: captainResult.userId, joined_at: now, is_active: true }],
          created_at: now,
          updated_at: now,
        });
      }
    }

    return NextResponse.json({
      success: true,
      school: { name: school.name, id: school._id.toString() },
      sports: Object.entries(sportIds).map(([slug, id]) => ({ slug, id: id.toString() })),
      scoringSystems: Object.entries(scoringSystemIds).map(([slug, id]) => ({ slug, id: id.toString() })),
      users: results,
      credentials: TEST_USERS.map((u) => ({
        type: u.type,
        email: u.email,
        password: u.password,
        role: u.role,
        description: u.description,
      })),
    });
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { error: "Failed to seed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    credentials: TEST_USERS.map((u) => ({
      type: u.type,
      email: u.email,
      password: u.password,
      role: u.role,
      description: u.description,
    })),
    instructions: [
      "POST to /api/seed to create all test data (users, sports, scoring systems, league)",
      "All passwords: TestPass123!",
    ],
  });
}
