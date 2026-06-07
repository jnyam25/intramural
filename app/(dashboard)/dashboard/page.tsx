import { getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ObjectId } from "mongodb";
import { MatchCard } from "@/components/matches/MatchCard";
import { WaiverStatusBadge } from "@/components/waivers/WaiverStatusBadge";
import { InviteLinkButton } from "@/components/teams/InviteLinkButton";

// ─── Local MongoDB document shapes ──────────────────────────────────────────
type MatchStatus = "scheduled" | "in_progress" | "completed" | "pending_score_approval" | "disputed";

interface MongoMatch {
  _id: ObjectId;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: Date;
  location?: string;
  status: MatchStatus;
  home_team_score?: number;
  away_team_score?: number;
  referee_user_id?: string;
}

interface MongoRosterMember {
  user_id: string;
  status: "pending" | "approved" | "rejected";
  waiver_signed?: boolean;
}

interface MongoTeam {
  _id: ObjectId;
  name: string;
  league_id?: string;
  captain_user_id?: string;
  invite_code?: string;
  roster: MongoRosterMember[];
}

interface MongoLeague {
  _id: ObjectId;
  name: string;
  status: string;
  max_roster_size?: number;
}

interface MongoUser {
  _id: ObjectId;
  first_name?: string;
  last_name?: string;
  email: string;
}

interface MongoRoleAssignment {
  _id: ObjectId;
  scope?: { team_id?: string };
}

interface MongoScoreSubmission {
  _id: ObjectId;
  match_id: string;
  status: string;
}

interface MongoIncidentReport {
  _id: ObjectId;
  severity: string;
  description: string;
  status?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function detectPrimaryRole(roles: string[]): string {
  for (const role of ["referee", "coach", "captain", "participant"] as const) {
    if (roles.includes(role)) return role;
  }
  return "participant";
}

function toOid(id: string): ObjectId {
  return new ObjectId(id);
}

async function buildTeamAndLeagueMaps(
  db: Awaited<ReturnType<typeof getScopedDb>>,
  matches: MongoMatch[]
) {
  const teamIds = Array.from(
    new Set(matches.flatMap((m) => [m.home_team_id, m.away_team_id]).filter(Boolean))
  );
  const leagueIds = Array.from(new Set(matches.map((m) => m.league_id).filter(Boolean)));
  const [rawTeams, rawLeagues] = await Promise.all([
    teamIds.length ? db.collection("teams").find({ _id: { $in: teamIds.map(toOid) } }).toArray() : [],
    leagueIds.length ? db.collection("leagues").find({ _id: { $in: leagueIds.map(toOid) } }).toArray() : [],
  ]);
  const teams = rawTeams as unknown as MongoTeam[];
  const leagues = rawLeagues as unknown as MongoLeague[];
  const teamMap: Record<string, string> = {};
  const leagueMap: Record<string, string> = {};
  for (const t of teams) teamMap[t._id.toString()] = t.name;
  for (const l of leagues) leagueMap[l._id.toString()] = l.name;
  return { teamMap, leagueMap };
}

function serializeMatch(m: MongoMatch) {
  return {
    id: m._id.toString(),
    leagueId: m.league_id ?? "",
    homeTeamId: m.home_team_id ?? "",
    awayTeamId: m.away_team_id ?? "",
    scheduledAt: m.scheduled_at ? new Date(m.scheduled_at).toISOString() : new Date().toISOString(),
    location: m.location,
    status: m.status,
  };
}

const ROLE_SUBTITLES: Record<string, string> = {
  participant: "Player Dashboard",
  captain: "Team Captain",
  coach: "Coach",
  referee: "Match Official",
};

export default async function DashboardPage() {
  const sessionWithRoles = await getSessionWithRoles();
  if (!sessionWithRoles) redirect("/login");

  const { userId, schoolId, roles, sportIds } = sessionWithRoles;
  if (!schoolId) redirect("/login");

  // School admin and platform admin belong in the admin console, not the player dashboard.
  const hasPlayerRole = roles.some(r => ["referee", "coach", "captain", "participant"].includes(r));
  if (!hasPlayerRole) {
    if (roles.includes("sports_admin") && sportIds.length > 0) {
      redirect(`/${schoolId}/sports/${sportIds[0]}`);
    }
    if (roles.includes("school_admin") || roles.includes("platform_admin") || roles.includes("league_admin")) {
      redirect(`/${schoolId}`);
    }
  }

  const db = await getScopedDb(schoolId);

  const rawUserDoc = await db.collection("users").findOne({ _id: toOid(userId) });
  const userDoc = rawUserDoc as unknown as MongoUser | null;
  const userName = userDoc
    ? `${userDoc.first_name ?? ""} ${userDoc.last_name ?? ""}`.trim() || userDoc.email
    : userId;

  const primaryRole = detectPrimaryRole(roles);

  // ─── Participant / Captain ─────────────────────────────────────────────────
  if (primaryRole === "participant" || primaryRole === "captain") {
    const rawUserTeams = await db.collection("teams").find({ "roster.user_id": userId }).toArray();
    const userTeams = rawUserTeams as unknown as MongoTeam[];
    const userTeamIds = userTeams.map((t) => t._id.toString());
    const isCaptain = primaryRole === "captain";
    const captainedTeams = userTeams.filter((t) => t.captain_user_id === userId);

    const [rawPendingLeagues, rawUpcoming, rawCompleted] = await Promise.all([
      db.collection("leagues").find({ status: "registration" }).toArray(),
      userTeamIds.length
        ? db.collection("matches").find({
            status: { $in: ["scheduled", "in_progress"] },
            $or: [{ home_team_id: { $in: userTeamIds } }, { away_team_id: { $in: userTeamIds } }],
          }).sort({ scheduled_at: 1 }).limit(2).toArray()
        : db.collection("matches").find({ status: "scheduled" }).sort({ scheduled_at: 1 }).limit(2).toArray(),
      userTeamIds.length
        ? db.collection("matches").find({
            status: "completed",
            $or: [{ home_team_id: { $in: userTeamIds } }, { away_team_id: { $in: userTeamIds } }],
          }).toArray()
        : Promise.resolve([]),
    ]);

    const pendingLeagues = rawPendingLeagues as unknown as MongoLeague[];
    const upcomingMatches = rawUpcoming as unknown as MongoMatch[];
    const completedMatches = rawCompleted as unknown as MongoMatch[];

    // Captain-only: roster compliance
    let pendingRosterCount = 0;
    let missingWaiverCount = 0;
    let leagueMaxRoster = 10;
    let totalRosterSize = 0;

    if (isCaptain && captainedTeams.length > 0) {
      for (const team of captainedTeams) {
        const roster = team.roster ?? [];
        pendingRosterCount += roster.filter((m) => m.status === "pending").length;
        missingWaiverCount += roster.filter((m) => !m.waiver_signed).length;
        totalRosterSize += roster.filter((m) => m.status === "approved").length;
      }
      const leagueId = captainedTeams[0].league_id;
      if (leagueId) {
        const rawLeague = await db.collection("leagues").findOne({ _id: toOid(leagueId) });
        const league = rawLeague as unknown as MongoLeague | null;
        if (league) leagueMaxRoster = league.max_roster_size ?? 10;
      }
    }

    const { teamMap, leagueMap } = await buildTeamAndLeagueMaps(db, upcomingMatches);

    let wins = 0, losses = 0, draws = 0;
    for (const m of completedMatches) {
      const isHome = userTeamIds.includes(m.home_team_id);
      const hs = m.home_team_score ?? 0;
      const as_ = m.away_team_score ?? 0;
      if (hs === as_) draws++;
      else if ((isHome && hs > as_) || (!isHome && as_ > hs)) wins++;
      else losses++;
    }
    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    return (
      <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
        <header className="space-y-1">
          <h1 className="heading-md text-white">Welcome back, {userName}</h1>
          <p className="text-body">{ROLE_SUBTITLES[primaryRole]}</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatBar label="Wins" value={wins} badge={{ text: "Season", cls: "badge-success" }} pct={totalGames > 0 ? wins / totalGames : 0} />
          <StatBar label="Losses" value={losses} badge={{ text: "Season", cls: "badge-neutral" }} barColor="bg-gray-500" pct={totalGames > 0 ? losses / totalGames : 0} />
          <StatBar label="Win Rate" value={`${winRate}%`} badge={{ text: `${totalGames} played`, cls: "badge-info" }} barColor="bg-cyber" textColor="text-cyber" pct={winRate / 100} />
          <StatBar label="Teams" value={userTeams.length} badge={{ text: "Active", cls: "badge-success" }} barColor="bg-volt" textColor="text-volt" pct={Math.min(1, userTeams.length / 5)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Compliance alert */}
            {pendingLeagues.length > 0 && (
              <div className="card p-6 border-l-4 border-l-hyper">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-hyper/10 flex items-center justify-center text-hyper shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-display font-semibold text-white mb-1">Action Required: Sign Waivers</h2>
                    <p className="text-caption mb-4">Sign the liability waiver to participate in these leagues.</p>
                    <div className="space-y-2">
                      {pendingLeagues.map((league) => (
                        <Link key={league._id.toString()} href={`/waivers/${league._id.toString()}`}
                          className="flex items-center justify-between p-3 bg-surface rounded-xl hover:bg-surface-elevated transition-colors group">
                          <span className="text-sm text-gray-200">{league.name}</span>
                          <span className="text-xs text-hyper group-hover:underline">Sign Now →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Captain: roster compliance */}
            {isCaptain && (
              <div className="card p-6 space-y-4">
                <h2 className="heading-sm text-white">Roster Compliance</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${pendingRosterCount > 0 ? "text-volt" : "text-gray-400"}`}>{pendingRosterCount}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Pending Approval</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${missingWaiverCount > 0 ? "text-hyper" : "text-gray-400"}`}>{missingWaiverCount}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Missing Waiver</div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Team Health</span>
                    <span>{totalRosterSize}/{leagueMaxRoster} players</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-bar-fill bg-volt ${pctClass(totalRosterSize / leagueMaxRoster)}`} />
                  </div>
                </div>
                <Link href="/teams" className="btn-ghost text-sm w-full justify-center">Manage Roster</Link>
              </div>
            )}

            {/* Captain: invite link */}
            {isCaptain && captainedTeams.length > 0 && (
              <div className="card p-6 space-y-3">
                <h2 className="heading-sm text-white">Quick Action</h2>
                <p className="text-caption">Share your team invite code with players.</p>
                <InviteLinkButton
                  inviteCode={captainedTeams[0].invite_code ?? "—"}
                  inviteUrl={`${process.env.NEXTAUTH_URL ?? ""}/teams/join?code=${captainedTeams[0].invite_code ?? ""}`}
                />
              </div>
            )}
          </div>

          {/* Upcoming matches */}
          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-sm text-white">Upcoming Matches</h2>
                <span className="badge-info">Next 2</span>
              </div>
              {upcomingMatches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-caption mb-4">No upcoming matches scheduled.</p>
                  <Link href="/leagues" className="btn-primary inline-flex">Browse Leagues</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMatches.map((m) => {
                    const sm = serializeMatch(m);
                    const myTeamSide = userTeamIds.includes(m.home_team_id) ? "home"
                      : userTeamIds.includes(m.away_team_id) ? "away" : undefined;
                    return (
                      <MatchCard key={sm.id} matchId={sm.id} leagueId={sm.leagueId}
                        leagueName={leagueMap[sm.leagueId]} homeTeamName={teamMap[sm.homeTeamId] ?? "Home"}
                        awayTeamName={teamMap[sm.awayTeamId] ?? "Away"} scheduledAt={sm.scheduledAt}
                        location={sm.location} status={sm.status}
                        viewerRole={isCaptain ? "captain" : "participant"} myTeamSide={myTeamSide} />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Coach ────────────────────────────────────────────────────────────────
  if (primaryRole === "coach") {
    const rawCoachAssignments = await db.collection("role_assignments").find({
      user_id: userId, role: "coach", revoked_at: { $exists: false },
    }).toArray();
    const coachAssignments = rawCoachAssignments as unknown as MongoRoleAssignment[];
    const scopedTeamIds = coachAssignments
      .map((a) => a.scope?.team_id)
      .filter((id): id is string => !!id);

    const rawCoachedTeams = scopedTeamIds.length
      ? await db.collection("teams").find({ _id: { $in: scopedTeamIds.map(toOid) } }).toArray()
      : [];
    const coachedTeams = rawCoachedTeams as unknown as MongoTeam[];

    const teamIds = coachedTeams.map((t) => t._id.toString());
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rawWeekly = teamIds.length
      ? await db.collection("matches").find({
          status: { $in: ["scheduled", "in_progress"] },
          scheduled_at: { $gte: now, $lte: weekEnd },
          $or: [{ home_team_id: { $in: teamIds } }, { away_team_id: { $in: teamIds } }],
        }).sort({ scheduled_at: 1 }).toArray()
      : [];
    const weeklyMatches = rawWeekly as unknown as MongoMatch[];

    const { teamMap, leagueMap } = await buildTeamAndLeagueMaps(db, weeklyMatches);

    const safetyIssues: Array<{ teamName: string; playerName: string }> = [];
    for (const team of coachedTeams) {
      for (const member of team.roster ?? []) {
        if (!member.waiver_signed && member.status === "approved") {
          safetyIssues.push({ teamName: team.name, playerName: member.user_id });
        }
      }
    }

    return (
      <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
        <header className="space-y-1">
          <h1 className="heading-md text-white">Welcome back, {userName}</h1>
          <p className="text-body">{ROLE_SUBTITLES.coach}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Safety check */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-sm text-white">Safety Check</h2>
                {safetyIssues.length > 0
                  ? <span className="badge-warning">{safetyIssues.length} issues</span>
                  : <span className="badge-success">All clear</span>}
              </div>
              {safetyIssues.length === 0 ? (
                <p className="text-caption">All players have signed waivers.</p>
              ) : (
                <div className="space-y-2">
                  {safetyIssues.slice(0, 5).map((issue, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                      <div>
                        <span className="text-sm text-gray-200">{issue.teamName}</span>
                        <span className="text-xs text-gray-500 ml-2">{issue.playerName}</span>
                      </div>
                      <WaiverStatusBadge signed={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message center */}
            <div className="card p-6 flex items-center justify-between">
              <div>
                <h2 className="heading-sm text-white mb-1">Message Center</h2>
                <p className="text-caption">Broadcast messages to your teams</p>
              </div>
              <Link href="/communications" className="btn-primary">Compose</Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-sm text-white">Weekly Schedule</h2>
                <span className="badge-info">Next 7 days</span>
              </div>
              {weeklyMatches.length === 0 ? (
                <p className="text-caption text-center py-6">No matches scheduled this week.</p>
              ) : (
                <div className="space-y-3">
                  {weeklyMatches.map((m) => {
                    const sm = serializeMatch(m);
                    return (
                      <MatchCard key={sm.id} matchId={sm.id} leagueId={sm.leagueId}
                        leagueName={leagueMap[sm.leagueId]} homeTeamName={teamMap[sm.homeTeamId] ?? "Home"}
                        awayTeamName={teamMap[sm.awayTeamId] ?? "Away"} scheduledAt={sm.scheduledAt}
                        location={sm.location} status={sm.status} viewerRole="coach" />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Referee ──────────────────────────────────────────────────────────────
  const now = new Date();
  const h48 = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const h2ago = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const [rawAssigned, rawRecentlyCompleted, rawIncidents] = await Promise.all([
    db.collection("matches").find({
      referee_user_id: userId,
      status: { $in: ["scheduled", "in_progress"] },
      scheduled_at: { $lte: h48 },
    }).sort({ scheduled_at: 1 }).toArray(),
    db.collection("matches").find({
      referee_user_id: userId,
      status: "completed",
      scheduled_at: { $gte: h2ago },
    }).toArray(),
    db.collection("incident_reports").find({ reported_by_user_id: userId })
      .sort({ created_at: -1 }).limit(5).toArray(),
  ]);

  const assignedMatches = rawAssigned as unknown as MongoMatch[];
  const recentlyCompleted = rawRecentlyCompleted as unknown as MongoMatch[];
  const recentIncidents = rawIncidents as unknown as MongoIncidentReport[];

  const completedMatchIds = recentlyCompleted.map((m) => m._id.toString());
  const rawApprovedSubs = completedMatchIds.length
    ? await db.collection("score_submissions").find({ match_id: { $in: completedMatchIds }, status: "approved" }).toArray()
    : [];
  const approvedSubs = rawApprovedSubs as unknown as MongoScoreSubmission[];
  const approvedMatchIds = new Set(approvedSubs.map((s) => s.match_id));
  const pendingScoreEntry = recentlyCompleted.filter((m) => !approvedMatchIds.has(m._id.toString()));

  const { teamMap: assignedTeamMap, leagueMap: assignedLeagueMap } = await buildTeamAndLeagueMaps(db, assignedMatches);

  const INCIDENT_STATUS_BADGE: Record<string, string> = {
    open: "badge-warning",
    under_review: "badge-info",
    resolved: "badge-success",
    escalated: "bg-hyper/10 text-hyper border border-hyper/20 px-2 py-0.5 rounded-full text-xs font-medium",
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <header className="space-y-1">
        <h1 className="heading-md text-white">Welcome back, {userName}</h1>
        <p className="text-body">{ROLE_SUBTITLES.referee}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Next 48h */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-sm text-white">Next 48 Hours</h2>
              <span className="badge-info">{assignedMatches.length} assigned</span>
            </div>
            {assignedMatches.length === 0 ? (
              <p className="text-caption text-center py-6">No assignments in the next 48 hours.</p>
            ) : (
              <div className="space-y-3">
                {assignedMatches.map((m) => {
                  const sm = serializeMatch(m);
                  return (
                    <MatchCard key={sm.id} matchId={sm.id} leagueId={sm.leagueId}
                      leagueName={assignedLeagueMap[sm.leagueId]} homeTeamName={assignedTeamMap[sm.homeTeamId] ?? "Home"}
                      awayTeamName={assignedTeamMap[sm.awayTeamId] ?? "Away"} scheduledAt={sm.scheduledAt}
                      location={sm.location} status={sm.status} viewerRole="referee" />
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending score entry */}
          {pendingScoreEntry.length > 0 && (
            <div className="card p-6 border-l-4 border-l-volt">
              <h2 className="heading-sm text-white mb-3">Pending Score Entry</h2>
              <p className="text-caption mb-4">These matches finished recently and need an official score.</p>
              <div className="space-y-2">
                {pendingScoreEntry.map((m) => (
                  <Link key={m._id.toString()}
                    href={`/leagues/${m.league_id}/matches/${m._id.toString()}`}
                    className="flex items-center justify-between p-3 bg-surface rounded-xl hover:bg-surface-elevated transition-colors">
                    <span className="text-sm text-gray-200">{assignedTeamMap[m.home_team_id] ?? "Home"} vs {assignedTeamMap[m.away_team_id] ?? "Away"}</span>
                    <span className="text-xs text-volt">Enter Score →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent incident reports */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-sm text-white">Recent Reports</h2>
              <Link href="/incidents/new" className="btn-primary text-sm py-1.5 px-3">File Report</Link>
            </div>
            {recentIncidents.length === 0 ? (
              <p className="text-caption text-center py-6">No recent incident reports.</p>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((inc) => (
                  <div key={inc._id.toString()} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                    <div>
                      <span className="text-sm text-gray-200 capitalize">{inc.severity} severity</span>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{inc.description}</p>
                    </div>
                    <span className={INCIDENT_STATUS_BADGE[inc.status ?? "open"] ?? "badge-neutral"}>{inc.status ?? "open"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function pctClass(pct: number): string {
  const p = Math.min(1, Math.max(0, pct));
  if (p === 0) return "w-0";
  if (p <= 0.1) return "w-[10%]";
  if (p <= 0.2) return "w-1/5";
  if (p <= 0.25) return "w-1/4";
  if (p <= 0.33) return "w-1/3";
  if (p <= 0.4) return "w-2/5";
  if (p <= 0.5) return "w-1/2";
  if (p <= 0.6) return "w-3/5";
  if (p <= 0.67) return "w-2/3";
  if (p <= 0.75) return "w-3/4";
  if (p <= 0.8) return "w-4/5";
  if (p <= 0.9) return "w-[90%]";
  return "w-full";
}

function StatBar({
  label, value, badge, barColor = "", textColor = "text-white", pct,
}: {
  label: string; value: string | number;
  badge: { text: string; cls: string };
  barColor?: string; textColor?: string; pct: number;
}) {
  return (
    <div className="card p-6 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-caption">{label}</span>
        <span className={badge.cls}>{badge.text}</span>
      </div>
      <div className={`heading-sm ${textColor}`}>{value}</div>
      <div className="progress-bar">
        <div className={`progress-bar-fill ${barColor} ${pctClass(pct)}`} />
      </div>
    </div>
  );
}
