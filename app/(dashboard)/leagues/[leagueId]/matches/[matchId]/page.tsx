import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { ScoreSubmissionForm } from "@/components/matches/ScoreSubmissionForm";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

export default async function MatchPage({
  params,
}: {
  params: { leagueId: string; matchId: string };
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);
  const userId = session.user.id;

  const [match, league] = await Promise.all([
    db.collection("matches").findOne({ _id: new ObjectId(params.matchId) }),
    db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) }),
  ]);

  if (!match || !league) notFound();

  const matchDoc = match as any;

  const [homeTeam, awayTeam] = await Promise.all([
    db.collection("teams").findOne({ _id: new ObjectId(matchDoc.home_team_id) }),
    db.collection("teams").findOne({ _id: new ObjectId(matchDoc.away_team_id) }),
  ]);

  const isHomeCaptain = (homeTeam as any)?.captain_user_id === userId;
  const isAwayCaptain = (awayTeam as any)?.captain_user_id === userId;
  const myTeamRole = isHomeCaptain ? "home" : isAwayCaptain ? "away" : null;
  const canSubmitScore = !!myTeamRole && matchDoc.status === "scheduled";

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    pending_score_approval: "bg-orange-100 text-orange-800",
    completed: "bg-green-100 text-green-800",
    disputed: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href={`/leagues/${params.leagueId}`} className="hover:text-gray-700">
          {(league as any).name}
        </Link>
        {" / "}
        <span>Match Details</span>
      </nav>

      {/* Match Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              statusColors[matchDoc.status] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {matchDoc.status.replace(/_/g, " ")}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(matchDoc.scheduled_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="flex items-center justify-between text-center">
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900">
              {(homeTeam as any)?.name ?? "Home Team"}
            </p>
            {matchDoc.status === "completed" && (
              <p className="text-4xl font-black text-gray-900 mt-2">
                {matchDoc.home_team_score ?? 0}
              </p>
            )}
          </div>
          <div className="px-6 text-xl font-bold text-gray-300">vs</div>
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900">
              {(awayTeam as any)?.name ?? "Away Team"}
            </p>
            {matchDoc.status === "completed" && (
              <p className="text-4xl font-black text-gray-900 mt-2">
                {matchDoc.away_team_score ?? 0}
              </p>
            )}
          </div>
        </div>

        {matchDoc.location && (
          <p className="text-center text-sm text-gray-400 mt-4">
            {matchDoc.location}
          </p>
        )}
      </div>

      {/* Score Submission */}
      {canSubmitScore && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Submit Score</h2>
          <ScoreSubmissionForm matchId={params.matchId} myTeamRole={myTeamRole!} />
        </div>
      )}

      {matchDoc.status === "pending_score_approval" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
          Score submitted — waiting for the opposing captain to confirm.
        </div>
      )}

      {matchDoc.status === "disputed" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          This match is under review. A league admin will resolve the dispute.
        </div>
      )}
    </div>
  );
}
