import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { ScoreSubmissionForm } from "@/components/matches/ScoreSubmissionForm";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  scheduled: { label: "Scheduled", badge: "badge-info" },
  in_progress: { label: "In Progress", badge: "badge-neutral" },
  pending_score_approval: { label: "Pending Confirmation", badge: "badge-neutral" },
  completed: { label: "Completed", badge: "badge-success" },
  disputed: { label: "Disputed", badge: "bg-hyper/10 text-hyper border border-hyper/20 px-2 py-0.5 rounded-full text-xs font-medium" },
  forfeited: { label: "Forfeited", badge: "badge-neutral" },
};

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

  const statusInfo = STATUS_LABELS[matchDoc.status] ?? { label: matchDoc.status, badge: "badge-neutral" };
  const isCompleted = matchDoc.status === "completed";
  const homeScore = matchDoc.home_team_score ?? 0;
  const awayScore = matchDoc.away_team_score ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/leagues" className="hover:text-gray-300 transition-colors">Leagues</Link>
        <span>/</span>
        <Link href={`/leagues/${params.leagueId}`} className="hover:text-gray-300 transition-colors">
          {(league as any).name}
        </Link>
        <span>/</span>
        <span className="text-gray-400">Match</span>
      </nav>

      {/* Match Card */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <span className={statusInfo.badge}>{statusInfo.label}</span>
          <span className="text-sm text-gray-400">
            {new Date(matchDoc.scheduled_at).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Scoreboard */}
        <div className="px-6 py-10 flex items-center justify-between text-center">
          <div className="flex-1 space-y-2">
            <p className="text-lg font-display font-semibold text-white">
              {(homeTeam as any)?.name ?? "Home Team"}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Home</p>
            {isCompleted && (
              <p className={`text-5xl font-display font-black mt-3 ${homeScore > awayScore ? "text-volt" : "text-gray-400"}`}>
                {homeScore}
              </p>
            )}
          </div>

          <div className="px-8 text-2xl font-bold text-gray-600">vs</div>

          <div className="flex-1 space-y-2">
            <p className="text-lg font-display font-semibold text-white">
              {(awayTeam as any)?.name ?? "Away Team"}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Away</p>
            {isCompleted && (
              <p className={`text-5xl font-display font-black mt-3 ${awayScore > homeScore ? "text-volt" : "text-gray-400"}`}>
                {awayScore}
              </p>
            )}
          </div>
        </div>

        {matchDoc.location && (
          <div className="px-6 pb-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            {matchDoc.location}
          </div>
        )}
      </div>

      {/* Score Submission */}
      {canSubmitScore && (
        <div className="card p-6 space-y-4">
          <h2 className="heading-sm text-white">Submit Score</h2>
          <p className="text-caption">
            Submit the final score as the {myTeamRole === "home" ? "home" : "away"} team captain.
            The opposing captain will need to confirm.
          </p>
          <ScoreSubmissionForm matchId={params.matchId} myTeamRole={myTeamRole!} />
        </div>
      )}

      {/* Status Notices */}
      {matchDoc.status === "pending_score_approval" && (
        <div className="card p-4 border-l-4 border-l-cyber">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyber/10 flex items-center justify-center text-cyber">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <p className="text-sm text-gray-300">
              Score submitted — waiting for the opposing captain to confirm.
            </p>
          </div>
        </div>
      )}

      {matchDoc.status === "disputed" && (
        <div className="card p-4 border-l-4 border-l-hyper">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-hyper/10 flex items-center justify-center text-hyper">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <p className="text-sm text-gray-300">
              This match is under review. A league admin will resolve the dispute.
            </p>
          </div>
        </div>
      )}

      {matchDoc.status === "completed" && (
        <div className="card p-4 border-l-4 border-l-volt">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-volt/10 flex items-center justify-center text-volt">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p className="text-sm text-gray-300">
              Match complete.{" "}
              {homeScore === awayScore
                ? "It's a draw."
                : `${homeScore > awayScore ? (homeTeam as any)?.name : (awayTeam as any)?.name} won ${Math.max(homeScore, awayScore)}–${Math.min(homeScore, awayScore)}.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
