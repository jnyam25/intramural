import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { SignUpSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SignUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { firstName, lastName, email, password } = parsed.data;

  // Optional school-domain gate for the pilot
  const pilotDomain = process.env.PILOT_SCHOOL_DOMAIN;
  if (pilotDomain && !email.toLowerCase().endsWith(`@${pilotDomain.toLowerCase()}`)) {
    return NextResponse.json(
      { error: `Only @${pilotDomain} email addresses may register during the pilot.` },
      { status: 403 }
    );
  }

  const schoolId = process.env.PILOT_SCHOOL_ID;
  if (!schoolId) {
    return NextResponse.json({ error: "Server misconfiguration: PILOT_SCHOOL_ID not set." }, { status: 500 });
  }

  const db = await getDb();

  const existing = await db.collection("users").findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const userResult = await db.collection("users").insertOne({
    email: email.toLowerCase(),
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    password_hash: passwordHash,
    school_ids: [schoolId],
    is_minor: false,
    role: "student",
    // sso_provider stays undefined for credential accounts
    created_at: now,
    updated_at: now,
  });

  const userId = userResult.insertedId.toString();

  // Auto-grant participant role for the pilot school
  await db.collection("role_assignments").insertOne({
    user_id: userId,
    school_id: schoolId,
    role: "participant",
    scope: {},
    granted_by_user_id: userId,
    granted_at: now,
  });

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp: now,
    actor_user_id: userId,
    action: "USER_REGISTERED",
    entity_type: "user",
    entity_id: userId,
    metadata: { email: email.toLowerCase(), method: "credentials" },
  });

  return NextResponse.json({ message: "Account created successfully." }, { status: 201 });
}
