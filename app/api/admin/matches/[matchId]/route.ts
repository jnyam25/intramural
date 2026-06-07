import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";

const MatchStatuses = [
  "scheduled",
  "in_progress",
  "pending_score_approval",
  "completed",
  "disputed",
] as const;

const AdminMatchUpdateSchema = z.object({
  scheduled_at: z.string().datetime().optional(),
  location: z.string().min(1).optional(),
  status: z.enum(MatchStatuses).optional(),
  cancellation_reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  const session = await getSessionWithRoles();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.assignments, "match:schedule")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = AdminMatchUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getScopedDb(session.schoolId);
  const match = await db.collection("matches").findOne({ _id: new ObjectId(params.matchId) });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const updates: Record<string, any> = { updated_at: new Date() };
  if (parsed.data.scheduled_at !== undefined) updates.scheduled_at = new Date(parsed.data.scheduled_at);
  if (parsed.data.location !== undefined) updates.location = parsed.data.location;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  await db.collection("matches").updateOne({ _id: new ObjectId(params.matchId) }, { $set: updates });

  const isCancellation = parsed.data.status === "completed" && parsed.data.cancellation_reason;
  const now = new Date();
  await db.collection("audit_logs").insertOne({
    school_id: session.schoolId,
    timestamp: now,
    actor_user_id: session.userId,
    action: isCancellation ? "MATCH_CANCELLED" : "MATCH_RESCHEDULED",
    entity_type: "match",
    entity_id: params.matchId,
    metadata: {
      ...updates,
      ...(isCancellation ? { cancellation_reason: parsed.data.cancellation_reason } : {}),
    },
  });

  return NextResponse.json({ message: "Match updated" });
}
