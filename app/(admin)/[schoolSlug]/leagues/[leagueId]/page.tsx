import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { TeamActions } from "@/components/admin/TeamActions";

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-neutral",
  registration: "badge-info",
  active: "badge-success",
  completed: "badge-neutral",
  archived: "badge-neutral",
};

const TEAM_STATUS_BADGE: Record<string, string> = {
  approved: "badge-success",
  pending: "badge-neutral",
  rejected: "bg-hyper/10 text-hyper border border-hyper/20 px-2 py-0.5 rounded-full text-xs font-medium",
  archived: "badge-neutral",
};

export default async function AdminLeaguePage({
  params,
}: {
  params: { schoolSlug: string; leagueId: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (
    !hasPermission(session.assignments, "league:manage", params.leagueId, "league") &&
    !hasPermission(session.assignments, "league:manage_any")
  ) {
    redirect("/dashboard");
  }

  const canApproveTeams = hasPermission(session.assignments, "team:approve");

  const db = await getScopedDb(session.schoolId);

  const [league, teams, upcomingMatches, disputedMatches] = await Promise.all([
    db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) }),
    db.collection("teams").find({ league_id: params.leagueId }).toArray(),
    db
      .collection("matches")
      .find({ league_id: params.leagueId, status: "scheduled" })
      .sort({ scheduled_at: 1 })
      .limit(20)
      .toArray(),
    db.collection("matches").find({ league_id: params.leagueId, status: "disputed" }).toArray(),
  ]);

  if (!league) notFound();

  const leagueDoc = league as any;
  const teamMap: Record<string, string> = {};
  for (const t of teams) {
    teamMap[(t as any)._id.toString()] = (t as any).name;
  }

  const disputeCount = (disputedMatches as any[]).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/${params.schoolSlug}/leagues`}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Leagues
            </Link>
          </div>
          <h1 className="heading-md text-white">{leagueDoc.name}</h1>
          <p className="text-body mt-1">{leagueDoc.season}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className={STATUS_BADGE[leagueDoc.status] ?? "badge-neutral"}>
            {leagueDoc.status}
          </span>
          {disputeCount > 0 && (
            <Link
              href={`/${params.schoolSlug}/leagues/${params.leagueId}/disputes`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-hyper/10 text-hyper border border-hyper/20 rounded-full text-xs font-semibold hover:bg-hyper/20 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              {disputeCount} Dispute{disputeCount > 1 ? "s" : ""}
            </Link>
          )}
          <Link
            href={`/${params.schoolSlug}/leagues/${params.leagueId}/edit`}
            className="btn-secondary text-sm"
          >
            Edit League
          </Link>
        </div>
      </div>

      {/* Teams */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="heading-sm text-white">Teams</h2>
            <p className="text-caption mt-0.5">{teams.length} registered · Max roster: {leagueDoc.max_roster_size}</p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-caption">No teams registered yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Players</th>
                <th>Status</th>
                {canApproveTeams && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(teams as any[]).map((t) => (
                <tr key={t._id.toString()}>
                  <td className="font-medium text-gray-200">{t.name}</td>
                  <td className="text-gray-400">{t.roster?.length ?? 0}</td>
                  <td>
                    <span className={TEAM_STATUS_BADGE[t.status] ?? "badge-neutral"}>
                      {t.status ?? "pending"}
                    </span>
                  </td>
                  {canApproveTeams && (
                    <td>
                      <TeamActions teamId={t._id.toString()} currentStatus={t.status ?? "pending"} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="heading-sm text-white">Upcoming Schedule</h2>
          <span className="text-caption">{upcomingMatches.length} match{upcomingMatches.length !== 1 ? "es" : ""}</span>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-caption">No scheduled matches. Generate a schedule from the Schedule page.</p>
            <Link href="/admin/schedule" className="btn-secondary text-sm mt-4 inline-flex">
              Go to Scheduler
            </Link>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Home</th>
                <th>Away</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {(upcomingMatches as any[]).map((m) => (
                <tr key={m._id.toString()}>
                  <td className="text-gray-400 whitespace-nowrap">
                    {new Date(m.scheduled_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="font-medium text-gray-200">{teamMap[m.home_team_id] ?? m.home_team_id}</td>
                  <td className="text-gray-400">{teamMap[m.away_team_id] ?? m.away_team_id}</td>
                  <td className="text-gray-500">{m.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
