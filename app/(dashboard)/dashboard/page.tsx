import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { TeamDashboard } from "@/components/teams/TeamDashboard";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const scopedDb = await getScopedDb(schoolId);
  const userId = session.user.id;
  const displayName = session.user.name ?? session.user.email ?? "there";

  const [pendingLeagues, userTeams, upcomingMatches] = await Promise.all([
    scopedDb.collection("leagues").find({ status: "registration" }).toArray(),
    scopedDb.collection("teams").find({ "roster.user_id": userId }).toArray(),
    scopedDb.collection("matches").find({}).limit(5).toArray(),
  ]);

  const isCaptain = userTeams.some((t: any) => t.captain_user_id === userId);

  // Sample stats for the dashboard
  const stats = {
    wins: 12,
    losses: 4,
    winRate: 75,
    pointsScored: 486,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header Section */}
      <header className="space-y-1">
        <h1 className="heading-md text-white">Welcome back, {displayName}</h1>
        <p className="text-body">Here is what needs your attention today.</p>
      </header>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption">Wins</span>
            <span className="badge-success">+2 this week</span>
          </div>
          <div className="heading-sm text-white">{stats.wins}</div>
          <div className="progress-bar">
            <div className="progress-bar-fill w-[60%]"></div>
          </div>
        </div>

        <div className="card p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption">Losses</span>
            <span className="badge-neutral">Season</span>
          </div>
          <div className="heading-sm text-white">{stats.losses}</div>
          <div className="progress-bar">
            <div className="progress-bar-fill bg-gray-500 w-[20%]"></div>
          </div>
        </div>

        <div className="card p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption">Win Rate</span>
            <span className="badge-info">Top 10%</span>
          </div>
          <div className="heading-sm text-cyber">{stats.winRate}%</div>
          <div className="progress-bar">
            <div className="progress-bar-fill bg-cyber" style={{ "--progress-width": `${stats.winRate}%` } as React.CSSProperties}></div>
          </div>
        </div>

        <div className="card p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-caption">Points Scored</span>
            <span className="badge-success">Avg 24.3</span>
          </div>
          <div className="heading-sm text-volt">{stats.pointsScored}</div>
          <div className="progress-bar">
            <div className="progress-bar-fill bg-hyper w-[80%]"></div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Action Items & Teams */}
        <div className="space-y-6">
          {/* Pending Waivers */}
          {pendingLeagues.length > 0 && (
            <div className="card p-6 border-l-4 border-l-hyper">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-hyper/10 flex items-center justify-center text-hyper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <div className="flex-1">
                  <h2 className="font-display font-semibold text-white mb-1">
                    Action Required: Pending Waivers
                  </h2>
                  <p className="text-caption mb-4">
                    You must sign the liability waiver to participate in these leagues.
                  </p>
                  <div className="space-y-2">
                    {pendingLeagues.map((league: any) => (
                      <Link
                        key={league._id.toString()}
                        href={`/waivers/${league._id.toString()}`}
                        className="flex items-center justify-between p-3 bg-surface rounded-xl hover:bg-surface-elevated transition-colors group"
                      >
                        <span className="text-sm text-gray-200">{league.name}</span>
                        <span className="text-xs text-hyper group-hover:underline">Sign Now &rarr;</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Teams */}
          {isCaptain && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-sm text-white">My Teams</h2>
                <Link href="/teams" className="text-sm text-volt hover:underline">View All</Link>
              </div>
              <div className="space-y-4">
                {userTeams
                  .filter((t: any) => t.captain_user_id === userId)
                  .map((team: any) => (
                    <TeamDashboard
                      key={team._id.toString()}
                      teamId={team._id.toString()}
                      isCaptain={true}
                      roster={team.roster}
                      inviteUrl={`/teams/join?token=`}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="heading-sm text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/teams" className="btn-secondary py-4 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                My Teams
              </Link>
              <Link href="/leagues" className="btn-secondary py-4 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 17 10 5 10-5M12 2v20"/><path d="m2 12 10 5 10-5"/></svg>
                Leagues
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - Upcoming Matches & Activity */}
        <div className="space-y-6">
          {/* Upcoming Matches */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-sm text-white">Upcoming Matches</h2>
              <span className="badge-info">This Week</span>
            </div>
            {upcomingMatches.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="text-caption">No upcoming matches scheduled.</p>
                <Link href="/leagues" className="btn-primary mt-4 inline-flex">
                  Browse Leagues
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((match: any) => (
                  <div key={match._id.toString()} className="flex items-center justify-between p-4 bg-surface rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="avatar-sm">VS</div>
                      <div>
                        <div className="font-medium text-white">{match.opponent || "TBD"}</div>
                        <div className="text-xs text-gray-500">{match.league_name || "League Match"}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-300">{match.date || "TBD"}</div>
                      <div className="text-xs text-gray-500">{match.time || ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <h2 className="heading-sm text-white mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-volt/10 flex items-center justify-center text-volt mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-200">Signed waiver for <span className="text-white font-medium">Basketball League</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-cyber/10 flex items-center justify-center text-cyber mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-200">Joined team <span className="text-white font-medium">Thunderbolts</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">Yesterday</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-hyper/10 flex items-center justify-center text-hyper mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-200">Match reminder: <span className="text-white font-medium">vs Hawks</span> tomorrow</p>
                  <p className="text-xs text-gray-500 mt-0.5">2 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
