/**
 * Seeds the "Pilot School" document used during Sprint 1.
 * Run with: npx tsx scripts/seed-pilot-school.ts
 * Copy the printed school_id into .env as PILOT_SCHOOL_ID.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { MongoClient } from "mongodb";

// Load .env from the project root (tsx does not auto-load it)
try {
  const envText = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= val;
  }
} catch {
  // .env not found — rely on environment variables already set
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set. Create a .env file or set the variable.");

async function main() {
  const client = new MongoClient(uri as string);
  await client.connect();
  const db = client.db("intramural");

  const existing = await db.collection("schools").findOne({ slug: "pilot-school" });
  if (existing) {
    console.log("Pilot school already exists:", existing._id.toString());
    console.log("\nAdd this to your .env file:");
    console.log(`PILOT_SCHOOL_ID=${existing._id.toString()}`);
    await client.close();
    return;
  }

  const now = new Date();
  const result = await db.collection("schools").insertOne({
    name: "Pilot School",
    slug: "pilot-school",
    domain: null,
    school_type: "college",
    timezone: "America/New_York",
    academic_year_start: new Date(`${now.getFullYear()}-08-01`),
    contact_email: "admin@pilot.example.com",
    settings: {
      require_parent_waiver_for_minors: false,
      allow_cross_sport_participation: true,
      default_scoring_system_id: null,
    },
    status: "trial",
    created_at: now,
  });

  const schoolId = result.insertedId.toString();
  console.log("Created pilot school:", schoolId);
  console.log("\nAdd this to your .env file:");
  console.log(`PILOT_SCHOOL_ID=${schoolId}`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
