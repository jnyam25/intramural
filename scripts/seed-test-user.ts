import { ObjectId } from "mongodb";
import { getUnencryptedDb } from "../lib/mongodb";

async function run() {
  const db = await getUnencryptedDb();

  const email = process.env.TEST_USER_EMAIL || "test.user+dev@intramural.local";
  const password = process.env.TEST_USER_PASSWORD || "TestPassword123!";

  console.log("Seeding test user:", email);

  // Ensure there is at least one school to attach to
  let school = await db.collection("schools").findOne({});
  if (!school) {
    const schoolDoc = {
      _id: new ObjectId(),
      name: "Pilot School",
      slug: "pilot-school",
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
    await db.collection("schools").insertOne(schoolDoc);
    school = schoolDoc;
    console.log("Created pilot school:", school._id.toString());
  }

  // Check if user already exists
  const existing = await db.collection("users").findOne({ email });
  let userId: ObjectId;

  if (existing) {
    userId = existing._id;
    console.log("Test user already exists with id:", userId.toString());
  } else {
    const userDoc = {
      _id: new ObjectId(),
      name: email.split("@")[0],
      email,
      emailVerified: null,
      sso_provider: "credentials",
      sso_id: null,
      first_name: "Test",
      last_name: "User",
      role: "admin",
      is_minor: false,
      school_ids: [school._id],
      created_at: new Date(),
      updated_at: new Date(),
      // Note: password is not stored here because the current Credentials provider
      // in this project performs authentication in memory. This field is for
      // developer reference only.
      password_hint: password,
    };

    const res = await db.collection("users").insertOne(userDoc);
    userId = res.insertedId as ObjectId;
    console.log("Inserted test user id:", userId.toString());
  }

  // Create a school_admin role assignment for the test user
  const existingAssignment = await db.collection("role_assignments").findOne({
    user_id: userId,
    school_id: school._id,
    role: "school_admin",
    revoked_at: { $exists: false },
  });

  if (existingAssignment) {
    console.log("Role assignment already exists");
  } else {
    const assignment = {
      _id: new ObjectId(),
      user_id: userId,
      school_id: school._id,
      role: "school_admin",
      scope: {},
      granted_by_user_id: userId,
      granted_at: new Date(),
    };
    await db.collection("role_assignments").insertOne(assignment);
    console.log("Created school_admin role assignment for user");
  }

  console.log("Seeding complete. You can sign in using the Credentials provider with:");
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
