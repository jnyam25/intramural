import { getSession, getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped-db";
import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { RosterManager } from "@/components/teams/RosterManager";
import { TeamChat } from "@/components/teams/TeamChat";

export default async function TeamPage({ params }: { params: { teamId: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const sessionWithRoles = await getSessionWithRoles();
  if (!sessionWithRoles) redirect("/login");

  const scopedDb = await getScopedDb(sessionWithRoles);

  // Scoped fetch automatically ensures this team belongs to the user's school
  const team = await scopedDb.collection("teams").findOne({
    _id: new ObjectId(params.teamId),
  });

  if (!team) notFound();

  // Verify user is captain
  const isCaptain = (team as any).captain_user_id === sessionWithRoles.userId;
  const isMember = team.roster?.some(
    (m: any) => m.user_id === sessionWithRoles.userId && m.status === "approved"
  );

  // Must be captain or approved member
  if (!isCaptain && !isMember) {
    redirect("/dashboard");
  }

  // Fetch user details for roster
  const rosterWithUsers = await Promise.all(
    team.roster.map(async (member: any) => {
      const user = await scopedDb
        .collection("users")
        .findOne({ _id: new ObjectId(member.user_id) });
      return {
        ...member,
        user: user
          ? {
              id: user._id.toString(),
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              image: user.image,
            }
          : null,
      };
    })
  );

  // Fetch upcoming matches
  const upcomingMatches = await scopedDb.collection("matches").find({
    $or: [{ home_team_id: params.teamId }, { away_team_id: params.teamId }],
    status: "scheduled",
  }).sort({ scheduled_at: 1 }).limit(5).toArray();

  // Get league info
  const league = team.league_id
    ? await scopedDb.collection("leagues").findOne({
        _id: new ObjectId(team.league_id),
      })
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="heading-md text-white">{team.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            {league && (
              <Link
                href={`/leagues/${team.league_id}`}
                className="text-body hover:text-volt transition-colors"
              >
                {league.name}
              </Link>
            )}
            <span className="text-gray-600">•</span>
            <span
              className={
                team.status === "forming"
                  ? "badge-info"
                  : team.status === "full"
                  ? "badge-warning"
                  : "badge-success"
              }
            >
              {team.status === "forming"
                ? "Forming"
                : team.status === "full"
                ? "Full"
                : "Active"}
            </span>
          </div>
        </div>

        {isCaptain && (
          <div className="flex items-center gap-2 bg-surface rounded-xl px-4 py-2">
            <span className="text-sm text-gray-400">Invite Code:</span>
            <code className="text-lg font-mono font-bold text-volt tracking-wider">
              {team.invite_code}
            </code>
            <button
              className="btn-ghost p-1"
              title="Copy to clipboard"
              onClick={() => {}}
            >
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
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Roster Management */}
        <div className="lg:col-span-2 space-y-6">
          <RosterManager
            teamId={team._id.toString()}
            isCaptain={isCaptain}
            roster={rosterWithUsers}
          />

          {/* Team Chat */}
          <TeamChat teamId={team._id.toString()} isMember={isMember} />
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Matches */}
          <div className="card p-6">
            <h3 className="heading-sm text-white mb-4">Upcoming Matches</h3>
            {upcomingMatches.length > 0 ? (
              <div className="space-y-3">
                {upcomingMatches.map((match: any) => (
                  <div
                    key={match._id.toString()}
                    className="p-3 rounded-xl bg-surface border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-cyber font-medium">
                        {new Date(match.scheduled_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(match.scheduled_at).toLocaleTimeString(
                          "en-US",
                          { hour: "numeric", minute: "2-digit" }
                        )}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-200">
                      vs {match.home_team_id === params.teamId ? "Away" : "Home"}
                    </p>
                    {match.location && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {match.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface flex items-center justify-center text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2v20" />
                  </svg>
                </div>
                <p className="text-caption">No upcoming matches</p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card p-6">
            <h3 className="heading-sm text-white mb-4">Team Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/teams/${params.teamId}/schedule`}
                className="btn-secondary w-full text-sm"
              >
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
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                Full Schedule
              </Link>
              {isCaptain && (
                <Link
                  href={`/teams/${params.teamId}/settings`}
                  className="btn-secondary w-full text-sm"
                >
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
                  >
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Team Settings
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

