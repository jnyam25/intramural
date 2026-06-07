import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport");
  const status = searchParams.get("status");
  
  const db = await getScopedDb(schoolId);
  
  // Build filter
  const filter: any = {};
  if (sport) filter.sport = sport;
  if (status) filter.status = status;
  
  const leagues = await db
    .collection("leagues")
    .find(filter)
    .sort({ registration_opens_at: -1 })
    .toArray();

  // Get team counts for each league
  const leaguesWithStats = await Promise.all(
    leagues.map(async (league: any) => {
      const teamCount = await db.collection("teams").countDocuments({ 
        league_id: league._id.toString() 
      });
      return {
        ...league,
        id: league._id.toString(),
        teamCount,
        _id: undefined,
      };
    })
  );

  return NextResponse.json({ leagues: leaguesWithStats });
}
