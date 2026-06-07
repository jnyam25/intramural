import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission, parseRoleAssignments } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const filter = searchParams.get("filter") || "";
  const limit = 50;

  // Build query
  const query: any = { school_id: schoolId };
  if (filter) {
    query.$or = [
      { action: { $regex: filter, $options: "i" } },
      { actor_user_id: { $regex: filter, $options: "i" } },
    ];
  }

  const logs = await db
    .collection("audit_logs")
    .find(query)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();

  return NextResponse.json({
    logs: logs.map((log: any) => ({
      id: log._id.toString(),
      timestamp: log.timestamp,
      actor_user_id: log.actor_user_id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      metadata: log.metadata,
      ip_address: log.ip_address || "unknown",
    })),
    page,
    hasMore: logs.length === limit,
  });
}
