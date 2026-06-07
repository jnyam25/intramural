import { ObjectId } from "mongodb";
import { getUnencryptedDb } from "../lib/mongodb";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const TEST_USERS = [
  {
    type: "participant",
    email: "participant@test.intramural",
    firstName: "Alex",
    lastName: "Participant",
    role: "participant",
    description: "Regular student — can join teams, view leagues, sign waivers",
  },
  {
    type: "captain",
    email: "captain@test.intramural",
    firstName: "Jordan",
    lastName: "Captain",
    role: "captain",
    description: "Team captain — manages roster, submits scores, invites players",
  },
  {
    type: "coach",
    email: "coach@test.intramural",
    firstName: "Riley",
    lastName: "Coach",
    role: "coach",
    description: "Coach — views team safety check, weekly schedule, broadcasts messages",
  },
  {
    type: "referee",
    email: "referee@test.intramural",
    firstName: "Sam",
    lastName: "Referee",
    role: "referee",
    description: "Match official — assigned matches, check-in, incident reports",
  },
  {
    type: "league_admin",
    email: "leagueadmin@test.intramural",
    firstName: "Morgan",
    lastName: "LeagueAdmin",
    role: "league_admin",
    description: "League admin — manages teams, matches, disputes for a league",
  },
  {
    type: "sports_admin",
    email: "sportsadmin@test.intramural",
    firstName: "Casey",
    lastName: "SportsAdmin",
    role: "sports_admin",
    description: "Sports coordinator — manages leagues, officials, schedules",
  },
  {
    type: "school_admin",
    email: "schooladmin@test.intramural",
    firstName: "Taylor",
    lastName: "SchoolAdmin",
    role: "school_admin",
    description: "School admin — full admin access: roles, waivers, reports, SSO, settings",
  },
  {
    type: "platform_admin",
    email: "platformadmin@test.intramural",
    firstName: "Dev",
    lastName: "PlatformAdmin",
    role: "platform_admin",
    description: "Platform admin — cross-school visibility, audit logs, eligibility, schedule",
  },
];

const PASSWORD = "TestPass123!";

async function run() {
  const db = await getUnencryptedDb();

  console.log("===========================================");
  console.log("  IntraPlay Test User Seeder");
  console.log("===========================================\n");

  // ── School ──────────────────────────────────────────────────────────────────
  let school = await db.collection("schools").findOne({});
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
        default_scoring_system_id: null,
        max_teams_per_student: 2,
        data_retention_days: 2555,
      },
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.collection("schools").insertOne(doc);
    school = doc;
    console.log(`✓ Created school: ${school.name} (${school._id})\n`);
  } else {
    console.log(`✓ Using existing school: ${school.name} (${school._id})\n`);
  }

  const schoolOid = school._id as ObjectId;
  const schoolId = schoolOid.toString();

  // ── Users ────────────────────────────────────────────────────────────────────
  console.log("Creating users...");
  console.log("-------------------------------------------");

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const userMap: Record<string, string> = {}; // type → userId string

  for (const cfg of TEST_USERS) {
    const existing = await db.collection("users").findOne({ email: cfg.email });
    let userId: string;

    if (existing) {
      userId = (existing._id as ObjectId).toString();
      console.log(`  ${cfg.type.padEnd(14)} ${cfg.email} (exists)`);
    } else {
      const doc = {
        _id: new ObjectId(),
        name: `${cfg.firstName} ${cfg.lastName}`,
        email: cfg.email,
        emailVerified: new Date(),
        sso_provider: "credentials",
        sso_id: null,
        first_name: cfg.firstName,
        last_name: cfg.lastName,
        password_hash: passwordHash,
        role: "student",
        is_minor: false,
        school_ids: [schoolOid],
        created_at: new Date(),
        updated_at: new Date(),
      };
      const res = await db.collection("users").insertOne(doc);
      userId = res.insertedId.toString();
      console.log(`  ${cfg.type.padEnd(14)} ${cfg.email} (created)`);
    }

    userMap[cfg.type] = userId;
  }

  console.log("-------------------------------------------\n");

  // ── Team ─────────────────────────────────────────────────────────────────────
  let teamId: string;
  const existingTeam = await db.collection("teams").findOne({ name: "Test Thunderbolts", school_id: schoolId });

  if (existingTeam) {
    teamId = (existingTeam._id as ObjectId).toString();
    console.log(`✓ Using existing team: Test Thunderbolts (${teamId})\n`);
  } else {
    const inviteCode = crypto.randomBytes(6).toString("hex").toUpperCase();
    const teamDoc = {
      _id: new ObjectId(),
      name: "Test Thunderbolts",
      school_id: schoolId,
      league_id: null,
      captain_user_id: userMap["captain"],
      invite_code: inviteCode,
      roster: [
        {
          user_id: userMap["captain"],
          role: "captain",
          status: "approved",
          joined_at: new Date(),
          is_active: true,
          waiver_signed: true,
        },
        {
          user_id: userMap["coach"],
          role: "coach",
          status: "approved",
          joined_at: new Date(),
          is_active: true,
          waiver_signed: true,
        },
      ],
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.collection("teams").insertOne(teamDoc);
    teamId = teamDoc._id.toString();
    console.log(`✓ Created team: Test Thunderbolts (invite: ${inviteCode})\n`);
  }

  // ── League ────────────────────────────────────────────────────────────────────
  let leagueId: string;
  const existingLeague = await db.collection("leagues").findOne({ name: "Test Basketball League" });

  if (existingLeague) {
    leagueId = (existingLeague._id as ObjectId).toString();
    console.log(`✓ Using existing league: Test Basketball League (${leagueId})\n`);
  } else {
    const leagueDoc = {
      _id: new ObjectId(),
      name: "Test Basketball League",
      school_id: schoolId,
      sport_id: null,
      scoring_system_id: null,
      season: "Fall 2024",
      division: "Open",
      max_roster_size: 12,
      eligibility_rules: {},
      start_date: new Date(),
      end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    };
    await db.collection("leagues").insertOne(leagueDoc);
    leagueId = leagueDoc._id.toString();
    console.log(`✓ Created league: Test Basketball League (${leagueId})\n`);
  }

  // ── Role Assignments ──────────────────────────────────────────────────────────
  console.log("Assigning roles...");
  console.log("-------------------------------------------");

  // Scope rules: captain & coach are scoped to team; league_admin to league; others no scope
  const scopeFor: Record<string, Record<string, string>> = {
    captain:      { team_id: teamId },
    coach:        { team_id: teamId },
    league_admin: { league_id: leagueId },
  };

  for (const cfg of TEST_USERS) {
    const userId = userMap[cfg.type];
    const existing = await db.collection("role_assignments").findOne({
      user_id: userId,
      school_id: schoolId,
      role: cfg.role,
      revoked_at: { $exists: false },
    });

    if (existing) {
      console.log(`  ${cfg.type.padEnd(14)} role '${cfg.role}' already assigned`);
    } else {
      await db.collection("role_assignments").insertOne({
        _id: new ObjectId(),
        user_id: userId,
        school_id: schoolId,
        role: cfg.role,
        scope: scopeFor[cfg.type] ?? {},
        granted_by_user_id: userMap["platform_admin"],
        granted_at: new Date(),
      });
      console.log(`  ${cfg.type.padEnd(14)} granted role '${cfg.role}'`);
    }
  }

  console.log("-------------------------------------------\n");

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("===========================================");
  console.log("  TEST CREDENTIALS  (password: TestPass123!)");
  console.log("===========================================\n");

  for (const cfg of TEST_USERS) {
    console.log(`  ${cfg.type.toUpperCase()}`);
    console.log(`    ${cfg.email}`);
    console.log(`    ${cfg.description}\n`);
  }

  console.log("===========================================");
  console.log("  HOW TO LOG IN");
  console.log("===========================================");
  console.log("  http://localhost:3000/login");
  console.log("  Password for all accounts: TestPass123!");
  console.log(`\n  Admin console: http://localhost:3000/${schoolId}`);
  console.log(`  Platform admin: http://localhost:3000/admin`);
  console.log("===========================================\n");

  process.exit(0);
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
