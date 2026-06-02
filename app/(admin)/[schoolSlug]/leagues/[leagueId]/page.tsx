import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

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

  const db = await getScopedDb(session.schoolId);

  const [league, teams, upcomingMatches, disputedMatches] = await Promise.all([
    db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) }),
    db.collection("teams").find({ league_id: params.leagueId }).toArray(),
    db.collection("matches").find({ league_id: params.leagueId, status: "scheduled" })
      .sort({ scheduled_at: 1 }).limit(20).toArray(),
    db.collection("matches").find({ league_id: params.leagueId, status: "disputed" }).toArray(),
  ]);

  if (!league) notFound();

  const leagueDoc = league as any;
  const teamMap: Record<string, string> = {};
  for (const t of teams) {
    teamMap[(t as any)._id.toString()] = (t as any).name;
  }

  const statusBadge: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    registration: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-gray-200 text-gray-600",
    archived: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{leagueDoc.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{leagueDoc.season}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusBadge[leagueDoc.status] ?? ""}`}>
            {leagueDoc.status}
          </span>
          {(disputedMatches as any[]).length > 0 && (
            <Link
              href={`/${params.schoolSlug}/admin/leagues/${params.leagueId}/disputes`}
              className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full hover:bg-red-200 transition-colors"
            >
              {(disputedMatches as any[]).length} Dispute{(disputedMatches as any[]).length > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Teams ({teams.length})</h2>
          <span className="text-sm text-gray-500">Max roster: {leagueDoc.max_roster_size}</span>
        </div>
        {teams.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No teams registered yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {teams.map((t: any) => (
              <li key={t._id.toString()} className="px-6 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{t.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{t.roster?.length ?? 0} players</span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium capitalize ${
                      t.status === "approved"
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Upcoming Schedule</h2>
        </div>
        {upcomingMatches.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No scheduled matches.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Home</th>
                <th className="px-6 py-3 text-left">Away</th>
                <th className="px-6 py-3 text-left">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {upcomingMatches.map((m: any) => (
                <tr key={m._id.toString()} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(m.scheduled_at).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-3 font-medium">{teamMap[m.home_team_id] ?? m.home_team_id}</td>
                  <td className="px-6 py-3">{teamMap[m.away_team_id] ?? m.away_team_id}</td>
                  <td className="px-6 py-3 text-gray-500">{m.location ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
