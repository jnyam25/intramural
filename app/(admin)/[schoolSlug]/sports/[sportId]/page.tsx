import { getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped";
import { getDb } from "@/lib/mongodb";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  draft:        "badge-neutral",
  registration: "badge-info",
  active:       "badge-success",
  completed:    "badge-neutral",
  archived:     "badge-neutral",
};

export default async function SportDashboardPage({
  params,
}: {
  params: { schoolSlug: string; sportId: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  const canManage =
    session.roles.includes("school_admin") ||
    session.roles.includes("platform_admin") ||
    (session.roles.includes("sports_admin") && session.sportIds.includes(params.sportId));

  if (!canManage) redirect(`/${params.schoolSlug}`);

  const rawDb  = await getDb();
  const db     = await getScopedDb(session.schoolId);

  // Sport document (global collection — must query by ID directly)
  const sport = await rawDb.collection("sports").findOne({ _id: new ObjectId(params.sportId) });
  if (!sport) redirect(`/${params.schoolSlug}`);

  // All non-archived leagues for this sport
  const leagues = await db
    .collection("leagues")
    .find({ sport_id: params.sportId, status: { $nin: ["archived"] } })
    .sort({ created_at: -1 })
    .toArray();

  const leagueIds     = leagues.map((l: any) => l._id.toString());
  const activeLeagues = leagues.filter((l: any) => l.status === "active");

  const now     = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    teamCount,
    upcomingMatches,
    pendingIssues,
    refereeCount,
  ] = await Promise.all([
    leagueIds.length
      ? db.collection("teams").countDocuments({ league_id: { $in: leagueIds } })
      : Promise.resolve(0),
    leagueIds.length
      ? db.collection("matches").find({
          league_id: { $in: leagueIds },
          status:    "scheduled",
          scheduled_at: { $gte: now, $lte: weekEnd },
        }).sort({ scheduled_at: 1 }).limit(8).toArray()
      : Promise.resolve([]),
    leagueIds.length
      ? db.collection("matches").countDocuments({
          league_id: { $in: leagueIds },
          status: { $in: ["disputed", "pending_score_approval"] },
        })
      : Promise.resolve(0),
    db.collection("role_assignments").countDocuments({
      role: "referee",
      revoked_at: { $exists: false },
    }),
  ]);

  // Resolve team names for the upcoming match list
  const matchTeamIds = (upcomingMatches as any[])
    .flatMap((m: any) => [m.home_team_id, m.away_team_id])
    .filter(Boolean)
    .filter((id: string) => ObjectId.isValid(id));

  const [rawTeams] = await Promise.all([
    matchTeamIds.length
      ? db.collection("teams").find({ _id: { $in: matchTeamIds.map((id: string) => new ObjectId(id)) } }).toArray()
      : Promise.resolve([]),
  ]);

  const teamMap: Record<string, string>   = Object.fromEntries((rawTeams as any[]).map((t: any) => [t._id.toString(), t.name as string]));
  const leagueMap: Record<string, string> = Object.fromEntries(leagues.map((l: any) => [l._id.toString(), l.name as string]));

  const sportName = sport.name as string;
  const sportDesc = (sport.description as string | undefined) ?? "";

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Sport Console</p>
          <h1 className="heading-md text-white">{sportName}</h1>
          {sportDesc && <p className="text-body mt-1">{sportDesc}</p>}
        </div>
        <Link
          href={`/${params.schoolSlug}/leagues/create?sport_id=${params.sportId}`}
          className="btn-primary shadow-glow-volt"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Create League
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Active Leagues"
          value={activeLeagues.length}
          sub={`${leagues.length} total`}
          color="volt"
        />
        <StatCard
          label="Registered Teams"
          value={teamCount}
          sub="across all leagues"
          color="cyber"
        />
        <StatCard
          label="Upcoming Matches"
          value={(upcomingMatches as any[]).length}
          sub="next 7 days"
          color="gray"
        />
        <StatCard
          label="Pending Issues"
          value={pendingIssues}
          sub="disputes & approvals"
          color="hyper"
          highlight={pendingIssues > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Leagues table ── */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="heading-sm text-white">Leagues</h2>
            <Link
              href={`/${params.schoolSlug}/leagues`}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              View all →
            </Link>
          </div>

          {leagues.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/></svg>
              </div>
              <p className="text-caption mb-4">No leagues for this sport yet.</p>
              <Link href={`/${params.schoolSlug}/leagues/create?sport_id=${params.sportId}`} className="btn-primary">
                Create First League
              </Link>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>League</th>
                  <th>Season</th>
                  <th>Status</th>
                  <th>Division</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {leagues.map((l: any) => (
                  <tr key={l._id.toString()}>
                    <td className="font-medium text-gray-200">{l.name}</td>
                    <td className="text-xs text-gray-500">{l.season ?? "—"}</td>
                    <td>
                      <span className={STATUS_BADGE[l.status] ?? "badge-neutral"}>
                        {l.status}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{l.division ?? "—"}</td>
                    <td>
                      <Link
                        href={`/${params.schoolSlug}/leagues/${l._id.toString()}`}
                        className="text-xs text-volt hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Sidebar: upcoming matches + referees ── */}
        <div className="space-y-6">

          {/* Upcoming matches */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h2 className="heading-sm text-white text-sm">Upcoming Matches</h2>
              <p className="text-xs text-gray-500 mt-0.5">Next 7 days · all leagues</p>
            </div>
            {(upcomingMatches as any[]).length === 0 ? (
              <p className="p-5 text-caption text-sm text-center">No matches scheduled this week.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {(upcomingMatches as any[]).slice(0, 6).map((m: any) => (
                  <div key={m._id.toString()} className="px-4 py-3">
                    <p className="text-xs text-gray-500 mb-0.5">{leagueMap[m.league_id] ?? "—"}</p>
                    <p className="text-sm font-medium text-gray-200">
                      {teamMap[m.home_team_id] ?? "Home"} <span className="text-gray-600">vs</span> {teamMap[m.away_team_id] ?? "Away"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(m.scheduled_at).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                      {m.location ? ` · ${m.location}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Referees */}
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Referees on Roster</p>
              <p className="text-2xl font-bold text-white">{refereeCount}</p>
            </div>
            <Link href={`/${params.schoolSlug}/officials`} className="btn-secondary text-sm">
              Manage
            </Link>
          </div>

          {/* Quick actions */}
          <div className="card p-5 space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Quick Actions</p>
            <Link href={`/${params.schoolSlug}/leagues/create?sport_id=${params.sportId}`} className="btn-ghost text-sm w-full justify-start">
              + New League
            </Link>
            <Link href={`/${params.schoolSlug}/disputes`} className="btn-ghost text-sm w-full justify-start">
              Review Disputes
              {pendingIssues > 0 && (
                <span className="ml-auto badge-warning">{pendingIssues}</span>
              )}
            </Link>
            <Link href={`/${params.schoolSlug}/officials`} className="btn-ghost text-sm w-full justify-start">
              Assign Referee
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat card component ───────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  color,
  highlight = false,
}: {
  label: string;
  value: number;
  sub?: string;
  color: "volt" | "cyber" | "hyper" | "gray";
  highlight?: boolean;
}) {
  const colorMap = {
    volt:  { icon: "text-volt  bg-volt/10  border-volt/20",  text: "text-volt"  },
    cyber: { icon: "text-cyber bg-cyber/10 border-cyber/20", text: "text-cyber" },
    hyper: { icon: "text-hyper bg-hyper/10 border-hyper/20", text: "text-hyper" },
    gray:  { icon: "text-gray-400 bg-gray-800/50 border-gray-700", text: "text-white" },
  };
  const c = colorMap[color];

  return (
    <div className={`card p-6 ${highlight ? "border-l-4 border-l-hyper" : ""}`}>
      <p className="text-caption text-xs mb-3">{label}</p>
      <p className={`text-3xl font-display font-bold ${c.text}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
