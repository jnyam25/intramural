import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission, parseRoleAssignments } from "@/lib/auth/permissions";

// GET /api/admin/eligibility/[userId] - Mock SIS eligibility check
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  // Verify admin permission
  const db = await getScopedDb(schoolId);
  const assignments = parseRoleAssignments(
    await db
      .collection("role_assignments")
      .find({ user_id: session.user.id, school_id: schoolId, revoked_at: null })
      .toArray()
  );

  if (!hasPermission(assignments, "school:view_all_reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check cache first
  const cached = await db.collection("eligibility_checks").findOne({
    user_id: userId,
    school_id: schoolId,
    expires_at: { $gt: new Date() },
  });

  if (cached) {
    return NextResponse.json({
      eligible: cached.is_eligible,
      status: cached.status,
      enrollment_date: cached.enrollment_date,
      academic_standing: cached.academic_standing,
      verified_at: cached.checked_at,
      source: "cache",
      cache_ttl_seconds: Math.floor((cached.expires_at.getTime() - Date.now()) / 1000),
    });
  }

  // Mock SIS API call - simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Get user details
  const user = await db.collection("users").findOne({
    _id: new ObjectId(userId),
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Mock eligibility logic based on email domain
  const email = user.email as string;
  const isEligible = email.endsWith("@test.intramural") || email.endsWith(".edu");
  
  // Determine status based on mock logic
  let status = "enrolled";
  if (email.includes("alumni")) status = "graduated";
  if (email.includes("suspended")) status = "suspended";

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Cache the result
  await db.collection("eligibility_checks").insertOne({
    _id: new ObjectId(),
    user_id: userId,
    school_id: schoolId,
    checked_at: now,
    is_eligible: isEligible,
    status,
    enrollment_date: "2023-09-01", // Mock data
    academic_standing: "good", // Mock data
    source: "mock_sis_api",
    expires_at: expiresAt,
  });

  // Log audit
  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp: now,
    actor_user_id: session.user.id,
    action: "ELIGIBILITY_CHECKED",
    entity_type: "user",
    entity_id: userId,
    metadata: { is_eligible: isEligible, status, source: "mock_sis_api" },
    ip_address: req.headers.get("x-forwarded-for") || "unknown",
    user_agent: req.headers.get("user-agent") || "unknown",
  });

  return NextResponse.json({
    eligible: isEligible,
    status,
    enrollment_date: "2023-09-01",
    academic_standing: "good",
    verified_at: now.toISOString(),
    source: "mock_sis_api",
    cache_ttl_seconds: 86400,
    user: {
      id: user._id.toString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
    },
  });
}
