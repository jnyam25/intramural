import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";

const LeagueStatuses = ["draft", "registration", "active", "completed", "archived"] as const;

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["registration"],
  registration: ["active", "draft"],
  active: ["completed"],
  completed: ["archived"],
  archived: [],
};

const UpdateLeagueRequestSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  division: z.string().optional(),
  max_roster_size: z.number().int().min(1).max(50).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  status: z.enum(LeagueStatuses).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await params;
  const session = await getSessionWithRoles();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const canManageAny = hasPermission(session.assignments, "league:manage_any");
  const canManageScoped = hasPermission(session.assignments, "league:manage", leagueId, "league");
  if (!canManageAny && !canManageScoped) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateLeagueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getScopedDb(session.schoolId);
  const league = await db.collection("leagues").findOne({ _id: new ObjectId(leagueId) });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  if (parsed.data.status) {
    const allowed = VALID_TRANSITIONS[league.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${league.status}" to "${parsed.data.status}"` },
        { status: 400 }
      );
    }
  }

  const updates: Record<string, any> = { updated_at: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.division !== undefined) updates.division = parsed.data.division;
  if (parsed.data.max_roster_size !== undefined) updates.max_roster_size = parsed.data.max_roster_size;
  if (parsed.data.start_date !== undefined) updates.start_date = new Date(parsed.data.start_date);
  if (parsed.data.end_date !== undefined) updates.end_date = new Date(parsed.data.end_date);
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  await db.collection("leagues").updateOne({ _id: new ObjectId(leagueId) }, { $set: updates });

  await db.collection("audit_logs").insertOne({
    school_id: session.schoolId,
    timestamp: new Date(),
    actor_user_id: session.userId,
    action: "LEAGUE_UPDATED",
    entity_type: "league",
    entity_id: leagueId,
    metadata: updates,
  });

  return NextResponse.json({ message: "League updated" });
}
