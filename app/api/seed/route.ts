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
    description: "Regular student participant - can join teams and view leagues"
  },
  {
    type: "captain",
    email: "captain@test.intramural",
    password: "TestPass123!",
    firstName: "Jordan",
    lastName: "Captain",
    role: "captain",
    description: "Team captain - can manage team roster and schedule matches"
  },
  {
    type: "school_admin",
    email: "schooladmin@test.intramural",
    password: "TestPass123!",
    firstName: "Taylor",
    lastName: "SchoolAdmin",
    role: "school_admin",
    description: "School administrator - full admin access to school settings, roles, and reports"
  },
  {
    type: "sports_admin",
    email: "sportsadmin@test.intramural",
    password: "TestPass123!",
    firstName: "Casey",
    lastName: "SportsAdmin",
    role: "sports_admin",
    description: "Sports coordinator - can manage leagues, schedules, and match results"
  },
  {
    type: "league_admin",
    email: "leagueadmin@test.intramural",
    password: "TestPass123!",
    firstName: "Morgan",
    lastName: "LeagueAdmin",
    role: "league_admin",
    description: "League administrator - can manage specific league settings and standings"
  }
];

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Seeding not allowed in production" }, { status: 403 });
  }

  try {
    const db = await getDb();
    const results: Array<{ type: string; email: string; status: string; userId?: string }> = [];

    // Ensure there is at least one school to attach to
    let school = await db.collection("schools").findOne({});
    if (!school) {
      const schoolDoc = {
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
          default_scoring_system_id: null,
        },
        status: "active",
        created_at: new Date(),
      };
      await db.collection("schools").insertOne(schoolDoc);
      school = schoolDoc;
    }

    // Create test users
    for (const userConfig of TEST_USERS) {
      // Check if user already exists
      const existing = await db.collection("users").findOne({ email: userConfig.email });
      let userId: ObjectId;

      if (existing) {
        userId = existing._id;
        results.push({
          type: userConfig.type,
          email: userConfig.email,
          status: "already exists",
          userId: userId.toString()
        });
      } else {
        // Hash password for credentials provider
        const passwordHash = await bcrypt.hash(userConfig.password, 12);

        const userDoc = {
          _id: new ObjectId(),
          name: `${userConfig.firstName} ${userConfig.lastName}`,
          email: userConfig.email,
          emailVerified: new Date(),
          sso_provider: "credentials",
          sso_id: null,
          first_name: userConfig.firstName,
          last_name: userConfig.lastName,
          password_hash: passwordHash,
          role: "student",
          is_minor: false,
          school_ids: [school._id],
          created_at: new Date(),
          updated_at: new Date(),
        };

        const res = await db.collection("users").insertOne(userDoc);
        userId = res.insertedId as ObjectId;
        results.push({
          type: userConfig.type,
          email: userConfig.email,
          status: "created",
          userId: userId.toString()
        });
      }

      // Create role assignment
      const existingAssignment = await db.collection("role_assignments").findOne({
        user_id: userId,
        school_id: school._id,
        role: userConfig.role,
        revoked_at: { $exists: false },
      });

      if (!existingAssignment) {
        const assignment = {
          _id: new ObjectId(),
          user_id: userId,
          school_id: school._id,
          role: userConfig.role,
          scope: userConfig.role === "captain" ? { team_id: null } : {},
          granted_by_user_id: userId,
          granted_at: new Date(),
        };
        await db.collection("role_assignments").insertOne(assignment);
      }
    }

    // Create a test team for the captain
    const captainResult = results.find(r => r.type === "captain" && r.userId);
    if (captainResult?.userId) {
      const existingTeam = await db.collection("teams").findOne({ captain_user_id: captainResult.userId });
      if (!existingTeam) {
        const teamDoc = {
          _id: new ObjectId(),
          name: "Test Thunderbolts",
          school_id: school._id.toString(),
          league_id: null,
          captain_user_id: captainResult.userId,
          roster: [
            { user_id: captainResult.userId, joined_at: new Date(), is_active: true }
          ],
          created_at: new Date(),
          updated_at: new Date(),
        };
        await db.collection("teams").insertOne(teamDoc);
      }
    }

    // Create a test league for the league admin
    const leagueAdminResult = results.find(r => r.type === "league_admin");
    if (leagueAdminResult) {
      const existingLeague = await db.collection("leagues").findOne({ name: "Test Basketball League" });
      if (!existingLeague) {
        const leagueDoc = {
          _id: new ObjectId(),
          name: "Test Basketball League",
          school_id: school._id.toString(),
          sport: "Basketball",
          season: "Fall 2024",
          status: "active",
          scoring_system_id: null,
          settings: {
            max_teams: 12,
            playoff_teams: 4,
            require_waiver: true,
          },
          created_at: new Date(),
          updated_at: new Date(),
        };
        await db.collection("leagues").insertOne(leagueDoc);
      }
    }

    return NextResponse.json({
      success: true,
      school: school.name,
      users: results,
      credentials: TEST_USERS.map(u => ({
        type: u.type,
        email: u.email,
        password: u.password,
        role: u.role,
        description: u.description
      }))
    });

  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { error: "Failed to seed test users", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return the test credentials without creating them
  return NextResponse.json({
    credentials: TEST_USERS.map(u => ({
      type: u.type,
      email: u.email,
      password: u.password,
      role: u.role,
      description: u.description
    })),
    instructions: [
      "POST to /api/seed to create all test users",
      "Or sign in at /auth/signin with any email above",
      "All passwords are: TestPass123!"
    ]
  });
}
