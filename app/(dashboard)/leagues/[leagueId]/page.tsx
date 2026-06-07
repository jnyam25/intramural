import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { Fragment } from "react";
import { WaiverSigner } from "@/components/waivers/WaiverSigner";
import { PlayoffQualificationCard } from "@/components/standings/PlayoffQualificationCard";

export default async function LeaguePage({ params }: { params: { leagueId: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);

  const [league, teams, standings, upcomingMatches, matchCount] = await Promise.all([
    db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) }),
    db.collection("teams").find({ league_id: params.leagueId }).toArray(),
    db.collection("standings").find({ league_id: params.leagueId }).sort({ rank: 1 }).toArray(),
    db.collection("matches").find({
      league_id: params.leagueId,
      status: "scheduled",
    }).sort({ scheduled_at: 1 }).limit(8).toArray(),
    db.collection("matches").countDocuments({
      league_id: params.leagueId,
      status: { $in: ["completed", "forfeit"] },
    }),
  ]);

  if (!league) notFound();

  const teamNames: Record<string, string> = {};
  for (const t of teams) {
    teamNames[(t as any)._id.toString()] = (t as any).name;
  }

  const leagueDoc = league as any;

  // Status badge mapping
  const statusBadges: Record<string, string> = {
    draft: "badge-neutral",
    registration: "badge-info",
    active: "badge-success",
    completed: "badge-neutral",
    archived: "badge-neutral",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="heading-md text-white">{leagueDoc.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-body">{leagueDoc.season}</span>
            <span className="text-gray-600">•</span>
            <span className={statusBadges[leagueDoc.status] || "badge-neutral"}>
              {leagueDoc.status}
            </span>
          </div>
        </div>
        <Link href="/leagues" className="btn-secondary text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          All Leagues
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Standings Table */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="heading-sm text-white">Standings</h2>
              <span className="text-xs text-gray-500">
                {matchCount} matches played
              </span>
            </div>
            {standings.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/></svg>
                </div>
                <p className="text-caption">No completed matches yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>Team</th>
                      <th className="text-center w-10">W</th>
                      <th className="text-center w-10">L</th>
                      <th className="text-center w-10">T</th>
                      <th className="text-center w-12">Pts</th>
                      <th className="text-center w-14">+/-</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(standings as any[]).map((row, i) => {
                      const showPlayoffLine = i === 4;

                      return (
                        <Fragment key={row.team_id}>
                          {showPlayoffLine && (
                            <tr>
                              <td colSpan={7} className="p-0 border-t-2 border-dashed border-volt/30">
                                <div className="flex items-center gap-2 px-4 py-1 bg-volt/5">
                                  <div className="w-2 h-2 rounded-full bg-volt animate-pulse" />
                                  <span className="text-xs text-volt font-medium">Playoff Cutoff</span>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr className="group">
                            <td className="text-gray-500 font-mono">{row.rank ?? i + 1}</td>
                            <td>
                              <details className="group/details">
                                <summary className="flex cursor-pointer list-none items-center gap-2">
                                  <span className="font-medium text-gray-200 group-hover:text-white transition-colors">{row.team_name}</span>
                                  {row.wins >= 3 && (
                                    <span className="text-xs" title="Winning streak">🔥</span>
                                  )}
                                  <span className="text-xs text-gray-600 group-open/details:rotate-90 transition-transform">›</span>
                                </summary>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                  <span className="badge-neutral">{row.wins + row.losses + row.ties} played</span>
                                  <span className="badge-success">{row.wins} wins</span>
                                  <span className="badge-neutral">{row.ties} ties</span>
                                </div>
                              </details>
                            </td>
                            <td className="text-center">
                              <span className="text-volt font-medium">{row.wins}</span>
                            </td>
                            <td className="text-center">
                              <span className="text-hyper">{row.losses}</span>
                            </td>
                            <td className="text-center text-gray-500">{row.ties}</td>
                            <td className="text-center">
                              <span className="font-bold text-white">{row.points}</span>
                            </td>
                            <td className="text-center">
                              <span className={row.point_differential > 0 ? "text-cyber" : row.point_differential < 0 ? "text-hyper" : "text-gray-500"}>
                                {row.point_differential > 0 ? "+" : ""}{row.point_differential}
                              </span>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Schedule */}
        <div>
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="heading-sm text-white">Upcoming Matches</h2>
            </div>
            {upcomingMatches.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="text-caption">No upcoming matches scheduled.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {upcomingMatches.map((m: any) => (
                  <Link
                    key={m._id.toString()}
                    href={`/leagues/${params.leagueId}/matches/${m._id.toString()}`}
                    className="block px-6 py-4 hover:bg-surface-elevated/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-cyber animate-pulse" />
                      <p className="text-xs text-cyber font-medium">
                        {new Date(m.scheduled_at).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <span className="text-gray-600">•</span>
                      <p className="text-xs text-gray-500">
                        {new Date(m.scheduled_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-200 group-hover:text-white">
                        <span className="text-gray-400">{teamNames[m.home_team_id] ?? "TBD"}</span>
                        {" "}
                        <span className="text-gray-600">vs</span>
                        {" "}
                        <span className="text-gray-400">{teamNames[m.away_team_id] ?? "TBD"}</span>
                      </p>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-600 group-hover:text-volt transition-colors"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </div>
                    {m.location && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        <p className="text-xs text-gray-500">{m.location}</p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Playoff Qualification Card */}
          <div className="mt-6">
            <PlayoffQualificationCard standings={standings as any} />
          </div>

          {/* League Stats Mini Card */}
          <div className="card p-6 mt-6">
            <h3 className="font-display font-semibold text-white mb-4">League Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-surface">
                <p className="text-2xl font-bold text-volt">{teams.length}</p>
                <p className="text-xs text-gray-500 mt-1">Teams</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-surface">
                <p className="text-2xl font-bold text-cyber">{matchCount}</p>
                <p className="text-xs text-gray-500 mt-1">Matches</p>
              </div>
            </div>
          </div>

          {/* Required Waiver */}
          <div className="mt-6">
            <WaiverSection leagueId={params.leagueId} />
          </div>
        </div>
      </div>
    </div>
  );
}

async function WaiverSection({ leagueId }: { leagueId: string }) {
  const session = await getSession();
  if (!session?.user) return null;

  const schoolId = getSchoolId(session);
  if (!schoolId) return null;

  const db = await getScopedDb(schoolId);

  // Get active waiver template for this league
  const waiverTemplate = await db.collection("waiver_templates").findOne({
    school_id: schoolId,
    is_active: true,
  });

  if (!waiverTemplate) return null;

  // Check if user already signed
  const existingSignature = await db.collection("waiver_signatures").findOne({
    user_id: session.user.id,
    waiver_template_id: waiverTemplate._id.toString(),
    league_id: leagueId,
  });

  if (existingSignature) {
    return (
      <div className="card p-6 border-l-4 border-l-volt">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-volt/10 flex items-center justify-center text-volt">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-white">Waiver Signed</h3>
            <p className="text-xs text-gray-500">
              Signed on {new Date(existingSignature.signed_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WaiverSigner
      template={{
        id: waiverTemplate._id.toString(),
        title: waiverTemplate.title,
        body_html: waiverTemplate.body_html,
        version: waiverTemplate.version,
      }}
      leagueId={leagueId}
    />
  );
}
