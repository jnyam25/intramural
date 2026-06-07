import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { z } from "zod";

const OnboardSchoolSchema = z.object({
  schoolName: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  domain: z.string().optional(),
  schoolType: z.enum(["k12", "college", "university"]),
  timezone: z.string().min(1),
  contactEmail: z.string().email(),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = OnboardSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const data = parsed.data;
  const now = new Date();

  const existingSchool = await db.collection("schools").findOne({
    $or: [
      { slug: data.slug },
      ...(data.domain ? [{ domain: data.domain.toLowerCase() }] : []),
    ],
  });
  if (existingSchool) {
    return NextResponse.json({ error: "A school with that slug or domain already exists." }, { status: 409 });
  }

  const schoolId = new ObjectId();
  const adminEmail = data.adminEmail.toLowerCase();
  const existingUser = await db.collection("users").findOne({ email: adminEmail });
  const userId = existingUser?._id ?? new ObjectId();

  await db.collection("schools").insertOne({
    _id: schoolId,
    name: data.schoolName.trim(),
    slug: data.slug,
    domain: data.domain?.toLowerCase() || null,
    school_type: data.schoolType,
    timezone: data.timezone,
    academic_year_start: new Date(now.getFullYear(), 7, 1),
    contact_email: data.contactEmail.toLowerCase(),
    settings: {
      require_parent_waiver_for_minors: data.schoolType === "k12",
      allow_cross_sport_participation: true,
      max_teams_per_student: 1,
      data_retention_days: 365 * 7,
    },
    status: "trial",
    created_at: now,
    updated_at: now,
  });

  if (existingUser) {
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $addToSet: { school_ids: schoolId.toString() },
        $set: { updated_at: now },
      }
    );
  } else {
    await db.collection("users").insertOne({
      _id: userId,
      email: adminEmail,
      first_name: data.adminFirstName.trim(),
      last_name: data.adminLastName.trim(),
      name: `${data.adminFirstName.trim()} ${data.adminLastName.trim()}`,
      school_ids: [schoolId.toString()],
      is_minor: false,
      role: "admin",
      created_at: now,
      updated_at: now,
    });
  }

  await db.collection("role_assignments").insertOne({
    user_id: userId.toString(),
    school_id: schoolId.toString(),
    role: "school_admin",
    scope: {},
    granted_by_user_id: userId.toString(),
    granted_at: now,
  });

  await db.collection("audit_logs").insertOne({
    school_id: schoolId.toString(),
    timestamp: now,
    actor_user_id: userId.toString(),
    action: "SCHOOL_ONBOARDED",
    entity_type: "school",
    entity_id: schoolId.toString(),
    metadata: { slug: data.slug, adminEmail },
  });

  return NextResponse.json({ schoolId: schoolId.toString(), slug: data.slug, message: "School onboarded" }, { status: 201 });
}
