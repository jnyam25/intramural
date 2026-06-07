import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";

const CreateLeagueRequestSchema = z.object({
  name: z.string().min(2).max(100),
  sport_id: z.string().length(24),
  scoring_system_id: z.string().length(24),
  season: z.string().min(1),
  division: z.string().optional(),
  max_roster_size: z.number().int().min(1).max(50),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionWithRoles();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.assignments, "league:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateLeagueRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, sport_id, scoring_system_id, season, division, max_roster_size, start_date, end_date } = parsed.data;

  if (new Date(end_date) <= new Date(start_date)) {
    return NextResponse.json({ error: "end_date must be after start_date" }, { status: 400 });
  }

  const db = await getScopedDb(session.schoolId);
  const now = new Date();
  const leagueId = new ObjectId();

  await db.collection("leagues").insertOne({
    _id: leagueId,
    name,
    sport_id,
    scoring_system_id,
    season,
    division: division ?? null,
    max_roster_size,
    start_date: new Date(start_date),
    end_date: new Date(end_date),
    status: "draft",
    created_at: now,
    updated_at: now,
  });

  await db.collection("audit_logs").insertOne({
    school_id: session.schoolId,
    timestamp: now,
    actor_user_id: session.userId,
    action: "LEAGUE_CREATED",
    entity_type: "league",
    entity_id: leagueId.toString(),
    metadata: { name, season },
  });

  return NextResponse.json({ leagueId: leagueId.toString(), message: "League created" }, { status: 201 });
}
