/**
 * FERPA Data Retention Script
 *
 * Anonymizes PII for users who left the school more than RETENTION_YEARS ago
 * (determined by `left_school_date` on the user document). Revokes all active
 * role assignments for anonymized users and writes an immutable audit log entry.
 *
 * Usage:
 *   DRY_RUN=true   npx ts-node scripts/ferpa-retention.ts   # preview only
 *   DRY_RUN=false  npx ts-node scripts/ferpa-retention.ts   # mutate
 *
 * Always run with DRY_RUN=true first to verify scope before mutating production.
 */

import { createHash } from "crypto";
import { getUnencryptedDb } from "../lib/mongodb";

const RETENTION_YEARS = 3;
const DRY_RUN = process.env.DRY_RUN !== "false";

async function run() {
  if (DRY_RUN) {
    console.log("⚠️  DRY RUN — no data will be modified. Set DRY_RUN=false to apply changes.");
  } else {
    console.log("🚨 LIVE RUN — data will be mutated.");
  }

  const db = await getUnencryptedDb();

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);

  console.log(`\n🔍 Scanning for users who left before ${cutoff.toISOString()}...`);

  const eligible = await db
    .collection("users")
    .find({
      left_school_date: { $lte: cutoff },
      is_anonymized: { $ne: true },
    })
    .toArray();

  if (eligible.length === 0) {
    console.log("✅ No users require anonymization at this time.");
    await (db.client as any).close();
    return;
  }

  console.log(`\n📦 Found ${eligible.length} user(s) eligible for anonymization:\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const user of eligible) {
    const userId = user._id.toString();
    const anonToken = createHash("sha256")
      .update(userId + process.env.FERPA_SALT)
      .digest("hex")
      .slice(0, 12);
    const anonEmail = `anon-${anonToken}@anonymized.invalid`;
    const schoolId = user.school_id as string | undefined;

    console.log(`  → User ${userId} | email: ${user.email ?? "unknown"} | school: ${schoolId ?? "none"}`);

    if (DRY_RUN) {
      console.log(`     [DRY RUN] Would anonymize to email: ${anonEmail}`);
      continue;
    }

    try {
      // 1. Anonymize PII fields
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            first_name: "Anonymized",
            last_name: "User",
            email: anonEmail,
            phone: null,
            sso_id: null,
            sso_provider: null,
            is_anonymized: true,
            anonymized_at: new Date(),
          },
          $unset: {
            display_name: "",
            notification_preferences: "",
          },
        }
      );

      // 2. Revoke all active role assignments
      await db.collection("role_assignments").updateMany(
        { user_id: userId, revoked_at: { $exists: false } },
        {
          $set: {
            revoked_at: new Date(),
            revocation_reason: "FERPA_DATA_RETENTION_POLICY",
            revoked_by_user_id: "SYSTEM",
          },
        }
      );

      // 3. Append-only audit log — never deleted, even by this script
      const auditDoc: Record<string, unknown> = {
        timestamp: new Date(),
        actor_user_id: "SYSTEM_FERPA_RETENTION",
        action: "USER_ANONYMIZED",
        entity_type: "user",
        entity_id: userId,
        metadata: {
          reason: `FERPA retention: left_school_date exceeded ${RETENTION_YEARS}-year threshold`,
          original_email_hash: createHash("sha256").update(user.email ?? "").digest("hex"),
        },
      };
      // Include school_id if present so the log is queryable per school
      if (schoolId) auditDoc.school_id = schoolId;
      await db.collection("audit_logs").insertOne(auditDoc);

      console.log(`     ✅ Anonymized.`);
      successCount++;
    } catch (err) {
      console.error(`     ❌ Failed: ${err}`);
      errorCount++;
    }
  }

  if (!DRY_RUN) {
    console.log(`\n🏁 Done. Anonymized: ${successCount}  Errors: ${errorCount}`);
  } else {
    console.log(`\n🏁 Dry run complete. ${eligible.length} user(s) would be anonymized.`);
    console.log("   Re-run with DRY_RUN=false to apply.");
  }

  // Close the mongo connection opened by getUnencryptedDb
  try {
    const client = (db as any).client;
    if (client?.close) await client.close();
  } catch {
    // ignore close errors
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
