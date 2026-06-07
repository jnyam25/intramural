import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const { leagueId } = await params;
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId =
    req.headers.get("x-school-id") ?? req.nextUrl.searchParams.get("schoolId");

  if (!schoolId) {
    return NextResponse.json({ error: "School context required" }, { status: 400 });
  }

  try {
    const db = await getScopedDb(schoolId);
    const [league, entries] = await Promise.all([
      db.collection("leagues").findOne({ _id: new ObjectId(leagueId) }),
      db.collection("standings").find({ league_id: leagueId }).sort({ rank: 1 }).toArray(),
    ]);

    if (!league) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    return NextResponse.json({
      league_name: (league as any).name,
      sport: (league as any).sport,
      standings: entries,
      generated_at: (entries[0] as any)?.last_updated ?? new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load standings" }, { status: 500 });
  }
}
