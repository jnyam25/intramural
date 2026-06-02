import { getSession, getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped-db";
import { TeamDashboard } from "@/components/teams/TeamDashboard";
import { ScoreSubmissionForm } from "@/components/matches/ScoreSubmissionForm";
import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";

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

  // Verify user is captain or coach
  const isManager = (team as any).captain_user_id === sessionWithRoles.userId;

  // Fetch upcoming matches for this team
  const upcomingMatches = await scopedDb.collection("matches").find({
    $or: [{ home_team_id: params.teamId }, { away_team_id: params.teamId }],
    status: "scheduled",
  }).sort({ scheduled_at: 1 }).limit(1).toArray();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {team.status === "forming" ? "Forming" : "Active"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Roster Management (2/3 width) */}
        <div className="lg:col-span-2">
          <TeamDashboard
            teamId={team._id.toString()}
            isCaptain={isManager}
            roster={team.roster}
            inviteUrl={isManager ? `/teams/join?token=mock-token` : undefined}
          />
        </div>

        {/* Right: Upcoming Match & Score Submission (1/3 width) */}
        <div className="space-y-6">
          {upcomingMatches.length > 0 ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Next Match</h3>
              <div className="text-sm text-gray-600 mb-4">
                vs. Opponent Team<br />
                {new Date(upcomingMatches[0].scheduled_at).toLocaleString()}
              </div>

              {isManager && upcomingMatches[0].status === "scheduled" && (
                <ScoreSubmissionForm
                  matchId={upcomingMatches[0]._id.toString()}
                  myTeamRole={upcomingMatches[0].home_team_id === team._id.toString() ? "home" : "away"}
                />
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
              No upcoming matches scheduled.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
