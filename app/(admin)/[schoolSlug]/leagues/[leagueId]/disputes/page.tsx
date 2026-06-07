import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { DisputeResolver } from "./DisputeResolver";

export default async function DisputesPage({
  params,
}: {
  params: { schoolSlug: string; leagueId: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "score:resolve_dispute")) {
    redirect("/dashboard");
  }

  const db = await getScopedDb(session.schoolId);

  const league = await db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) });
  if (!league) notFound();

  const disputedMatches = await db
    .collection("matches")
    .find({ league_id: params.leagueId, status: "disputed" })
    .toArray();

  const matchIds = disputedMatches.map((m: any) => m._id.toString());
  const allSubmissions = matchIds.length
    ? await db
        .collection("score_submissions")
        .find({ match_id: { $in: matchIds }, status: "pending" })
        .toArray()
    : [];

  const submissionsByMatch: Record<string, any[]> = {};
  for (const sub of allSubmissions) {
    const mid = (sub as any).match_id;
    if (!submissionsByMatch[mid]) submissionsByMatch[mid] = [];
    submissionsByMatch[mid].push(sub);
  }

  const teams = await db.collection("teams").find({ league_id: params.leagueId }).toArray();
  const teamMap: Record<string, string> = {};
  for (const t of teams) {
    teamMap[(t as any)._id.toString()] = (t as any).name;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link
            href={`/${params.schoolSlug}/leagues/${params.leagueId}`}
            className="hover:text-gray-300 transition-colors"
          >
            {(league as any).name}
          </Link>
          <span>/</span>
          <span className="text-gray-400">Disputes</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-md text-white">Score Disputes</h1>
            <p className="text-body mt-1">{disputedMatches.length} unresolved dispute{disputedMatches.length !== 1 ? "s" : ""}</p>
          </div>
          {disputedMatches.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-hyper/10 text-hyper border border-hyper/20 rounded-full text-xs font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Requires attention
            </span>
          )}
        </div>
      </div>

      {disputedMatches.length === 0 ? (
        <div className="card p-8 text-center border-l-4 border-l-volt">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-volt/10 flex items-center justify-center text-volt">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 className="heading-sm text-white mb-2">All Clear</h2>
          <p className="text-body">No active disputes — all scores are confirmed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputedMatches.map((match: any) => {
            const submissions = submissionsByMatch[match._id.toString()] ?? [];
            return (
              <div key={match._id.toString()} className="card overflow-hidden border-l-4 border-l-hyper">
                {/* Match header */}
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-semibold text-white">
                      {teamMap[match.home_team_id] ?? "Home"} vs {teamMap[match.away_team_id] ?? "Away"}
                    </h2>
                    <p className="text-caption mt-0.5">
                      {new Date(match.scheduled_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="bg-hyper/10 text-hyper border border-hyper/20 px-2 py-0.5 rounded-full text-xs font-medium">
                    Disputed
                  </span>
                </div>

                {/* Conflicting submissions */}
                <div className="px-6 py-4 space-y-3">
                  {submissions.length === 0 ? (
                    <p className="text-caption">No pending score submissions found.</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-400">Conflicting submissions:</p>
                      <div className="space-y-2">
                        {submissions.map((sub: any) => (
                          <div
                            key={sub._id.toString()}
                            className="flex items-center justify-between bg-surface rounded-xl px-4 py-3"
                          >
                            <div>
                              <span className="text-sm text-gray-300 capitalize">
                                {sub.submitted_by_team_role} team captain
                              </span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {new Date(sub.submitted_at).toLocaleString()}
                              </p>
                            </div>
                            <span className="font-mono font-bold text-white text-lg">
                              {sub.home_team_score} – {sub.away_team_score}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Resolver */}
                <div className="px-6 pb-5">
                  <DisputeResolver matchId={match._id.toString()} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
