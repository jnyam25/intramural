import { ObjectId } from "mongodb";
import { getUnencryptedDb } from "../lib/mongodb";
import bcrypt from "bcryptjs";

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

async function run() {
  const db = await getUnencryptedDb();

  console.log("===========================================");
  console.log("  IntraPlay Test User Seeder");
  console.log("===========================================\n");

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
    console.log("✓ Created test school:", school.name, "(" + school._id.toString() + ")\n");
  } else {
    console.log("✓ Using existing school:", school.name, "(" + school._id.toString() + ")\n");
  }

  console.log("Creating test users...\n");
  console.log("-------------------------------------------");

  const createdUsers: Array<{ type: string; email: string; password: string; role: string; userId: string }> = [];

  for (const userConfig of TEST_USERS) {
    // Check if user already exists
    const existing = await db.collection("users").findOne({ email: userConfig.email });
    let userId: ObjectId;

    if (existing) {
      userId = existing._id;
      console.log(`  ${userConfig.type}:`, userConfig.email, "(already exists)");
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
      console.log(`  ${userConfig.type}:`, userConfig.email, "(created)");
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

    createdUsers.push({
      type: userConfig.type,
      email: userConfig.email,
      password: userConfig.password,
      role: userConfig.role,
      userId: userId.toString(),
    });
  }

  console.log("-------------------------------------------\n");

  // Create a test team for the captain
  const captainUser = createdUsers.find(u => u.type === "captain");
  if (captainUser) {
    const existingTeam = await db.collection("teams").findOne({ captain_user_id: captainUser.userId });
    if (!existingTeam) {
      const teamDoc = {
        _id: new ObjectId(),
        name: "Test Thunderbolts",
        school_id: school._id.toString(),
        league_id: null,
        captain_user_id: captainUser.userId,
        roster: [
          { user_id: captainUser.userId, joined_at: new Date(), is_active: true }
        ],
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.collection("teams").insertOne(teamDoc);
      console.log("✓ Created test team: 'Test Thunderbolts' for captain\n");
    }
  }

  // Create a test league for the league admin
  const leagueAdminUser = createdUsers.find(u => u.type === "league_admin");
  if (leagueAdminUser) {
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
      console.log("✓ Created test league: 'Test Basketball League'\n");
    }
  }

  // Print summary
  console.log("===========================================");
  console.log("  TEST CREDENTIALS SUMMARY");
  console.log("===========================================\n");

  createdUsers.forEach((user) => {
    const config = TEST_USERS.find(u => u.type === user.type);
    console.log(`${user.type.toUpperCase()}`);
    console.log(`  Email:    ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log(`  Role:     ${user.role}`);
    console.log(`  Desc:     ${config?.description}`);
    console.log("");
  });

  console.log("===========================================");
  console.log("  LOGIN INSTRUCTIONS");
  console.log("===========================================");
  console.log("1. Go to: http://localhost:3000/login");
  console.log("2. Click 'Sign in with email (dev)'");
  console.log("3. Enter any of the emails above with password: TestPass123!");
  console.log("\nOr use the direct credentials provider at: /auth/signin");
  console.log("===========================================\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
