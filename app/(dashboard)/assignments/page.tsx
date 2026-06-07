import { getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { MatchCard } from "@/components/matches/MatchCard";

type MatchStatus = "scheduled" | "in_progress" | "completed" | "pending_score_approval" | "disputed";

interface MongoMatch {
  _id: ObjectId;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: Date;
  location?: string;
  status: MatchStatus;
}

interface MongoNamedDoc {
  _id: ObjectId;
  name: string;
}

function toOid(id: string): ObjectId {
  return new ObjectId(id);
}

export default async function AssignmentsPage() {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");
  if (!session.roles.includes("referee")) redirect("/dashboard");

  const { userId, schoolId } = session;
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);

  const rawAssigned = await db
    .collection("matches")
    .find({ referee_user_id: userId, status: { $in: ["scheduled", "in_progress", "completed"] } })
    .sort({ scheduled_at: 1 })
    .toArray();
  const allAssigned = rawAssigned as unknown as MongoMatch[];

  const teamIds = Array.from(new Set(
    allAssigned.flatMap((m) => [m.home_team_id, m.away_team_id]).filter(Boolean)
  ));
  const leagueIds = Array.from(new Set(allAssigned.map((m) => m.league_id).filter(Boolean)));

  const [rawTeams, rawLeagues] = await Promise.all([
    teamIds.length ? db.collection("teams").find({ _id: { $in: teamIds.map(toOid) } }).toArray() : [],
    leagueIds.length ? db.collection("leagues").find({ _id: { $in: leagueIds.map(toOid) } }).toArray() : [],
  ]);
  const teams = rawTeams as unknown as MongoNamedDoc[];
  const leagues = rawLeagues as unknown as MongoNamedDoc[];

  const teamMap: Record<string, string> = {};
  const leagueMap: Record<string, string> = {};
  for (const t of teams) teamMap[t._id.toString()] = t.name;
  for (const l of leagues) leagueMap[l._id.toString()] = l.name;

  const upcoming = allAssigned.filter((m) => m.status === "scheduled");
  const active = allAssigned.filter((m) => m.status === "in_progress");
  const past = allAssigned.filter((m) => m.status === "completed");

  function matchProps(m: MongoMatch) {
    return {
      matchId: m._id.toString(),
      leagueId: m.league_id ?? "",
      leagueName: leagueMap[m.league_id],
      homeTeamName: teamMap[m.home_team_id] ?? "Home",
      awayTeamName: teamMap[m.away_team_id] ?? "Away",
      scheduledAt: m.scheduled_at ? new Date(m.scheduled_at).toISOString() : new Date().toISOString(),
      location: m.location,
      status: m.status,
    };
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      <header>
        <h1 className="heading-md text-white">My Assignments</h1>
        <p className="text-body mt-1">Matches assigned to you as referee</p>
      </header>

      {active.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="heading-sm text-white">In Progress</h2>
            <span className="badge-success">{active.length}</span>
          </div>
          <div className="space-y-3">
            {active.map((m) => <MatchCard key={m._id.toString()} {...matchProps(m)} viewerRole="referee" />)}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="heading-sm text-white">Upcoming</h2>
          <span className="badge-info">{upcoming.length}</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-caption">No upcoming assignments.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => <MatchCard key={m._id.toString()} {...matchProps(m)} viewerRole="referee" />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="heading-sm text-white">Past</h2>
            <span className="badge-neutral">{past.length}</span>
          </div>
          <div className="space-y-3">
            {past.map((m) => <MatchCard key={m._id.toString()} {...matchProps(m)} viewerRole="referee" />)}
          </div>
        </section>
      )}
    </div>
  );
}
