import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { calculateStandings } from "@/lib/standings/calculator";
import { DEFAULT_CONFIG } from "@/lib/standings/types";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

export default async function LeaguePage({ params }: { params: { leagueId: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);

  const [league, teams, completedMatches, upcomingMatches] = await Promise.all([
    db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) }),
    db.collection("teams").find({ league_id: params.leagueId }).toArray(),
    db.collection("matches").find({
      league_id: params.leagueId,
      status: { $in: ["completed", "forfeit"] },
    }).toArray(),
    db.collection("matches").find({
      league_id: params.leagueId,
      status: "scheduled",
    }).sort({ scheduled_at: 1 }).limit(8).toArray(),
  ]);

  if (!league) notFound();

  const teamNames: Record<string, string> = {};
  for (const t of teams) {
    teamNames[(t as any)._id.toString()] = (t as any).name;
  }

  const standings = calculateStandings(
    completedMatches.map((m: any) => ({
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_team_score: m.home_team_score ?? 0,
      away_team_score: m.away_team_score ?? 0,
      status: m.status,
      forfeit_team_role: m.forfeit_team_role ?? null,
    })),
    teamNames,
    DEFAULT_CONFIG
  );

  const leagueDoc = league as any;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{leagueDoc.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {leagueDoc.season} • Status:{" "}
            <span className="capitalize font-medium text-blue-700">{leagueDoc.status}</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Standings Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Standings</h2>
            </div>
            {standings.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No completed matches yet.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Team</th>
                    <th className="px-4 py-3 text-center">W</th>
                    <th className="px-4 py-3 text-center">L</th>
                    <th className="px-4 py-3 text-center">T</th>
                    <th className="px-4 py-3 text-center">Pts</th>
                    <th className="px-4 py-3 text-center">+/-</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {standings.map((row, i) => (
                    <tr key={row.team_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.team_name}</td>
                      <td className="px-4 py-3 text-center text-green-700 font-medium">{row.wins}</td>
                      <td className="px-4 py-3 text-center text-red-600">{row.losses}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{row.ties}</td>
                      <td className="px-4 py-3 text-center font-bold">{row.points}</td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {row.point_differential > 0 ? "+" : ""}{row.point_differential}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Upcoming Matches</h2>
            </div>
            {upcomingMatches.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">No upcoming matches.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingMatches.map((m: any) => (
                  <li key={m._id.toString()}>
                    <Link
                      href={`/leagues/${params.leagueId}/matches/${m._id.toString()}`}
                      className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <p className="text-xs text-gray-400 mb-1">
                        {new Date(m.scheduled_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm font-medium text-gray-800">
                        {teamNames[m.home_team_id] ?? "TBD"}{" "}
                        <span className="text-gray-400">vs</span>{" "}
                        {teamNames[m.away_team_id] ?? "TBD"}
                      </p>
                      {m.location && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.location}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
