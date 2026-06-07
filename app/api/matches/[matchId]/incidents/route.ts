import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/auth/permissions";

const IncidentReportSchema = z.object({
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().min(10).max(2000),
  involved_user_ids: z.array(z.string().length(24)).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 401 });
  }

  const db = await getScopedDb(schoolId);
  const assignments = await db
    .collection("role_assignments")
    .find({ user_id: session.user.id, school_id: schoolId, revoked_at: null })
    .toArray();

  const canReport =
    hasPermission(assignments as any, "incident:report") ||
    hasPermission(assignments as any, "league:manage") ||
    hasPermission(assignments as any, "league:manage_any");

  if (!canReport) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = IncidentReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify the match exists within this school's scope
  const match = await db
    .collection("matches")
    .findOne({ _id: new ObjectId(params.matchId) });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const timestamp = new Date();
  const { severity, description, involved_user_ids } = parsed.data;

  const result = await db.collection("incident_reports").insertOne({
    match_id: params.matchId,
    reported_by_user_id: session.user.id,
    severity,
    description,
    involved_user_ids: involved_user_ids ?? [],
    status: "open",
    created_at: timestamp,
  });

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "INCIDENT_REPORTED",
    entity_type: "incident_report",
    entity_id: result.insertedId.toString(),
    metadata: { match_id: params.matchId, severity },
  });

  return NextResponse.json(
    { incidentId: result.insertedId.toString() },
    { status: 201 }
  );
}
