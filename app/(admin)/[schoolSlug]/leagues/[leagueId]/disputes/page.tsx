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

  // Fetch all pending score submissions for each disputed match
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

  // Resolve team names
  const teams = await db.collection("teams").find({ league_id: params.leagueId }).toArray();
  const teamMap: Record<string, string> = {};
  for (const t of teams) {
    teamMap[(t as any)._id.toString()] = (t as any).name;
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="text-sm text-gray-500 mb-2">
          <Link href={`/${params.schoolSlug}/admin/leagues/${params.leagueId}`} className="hover:text-gray-700">
            {(league as any).name}
          </Link>
          {" / "}
          <span>Disputes</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Score Disputes</h1>
        <p className="text-sm text-gray-500 mt-1">{disputedMatches.length} unresolved dispute(s)</p>
      </div>

      {disputedMatches.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <p className="text-green-800 font-medium">No active disputes. All scores are confirmed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputedMatches.map((match: any) => {
            const submissions = submissionsByMatch[match._id.toString()] ?? [];
            return (
              <div key={match._id.toString()} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-red-50">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900">
                      {teamMap[match.home_team_id] ?? "Home"} vs {teamMap[match.away_team_id] ?? "Away"}
                    </h2>
                    <span className="text-xs text-red-700 font-medium">
                      {new Date(match.scheduled_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {submissions.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-500">No pending submissions found.</p>
                ) : (
                  <div className="px-6 py-4 space-y-3">
                    <p className="text-sm text-gray-600 font-medium">Conflicting submissions:</p>
                    {submissions.map((sub: any) => (
                      <div key={sub._id.toString()} className="flex items-center justify-between bg-gray-50 rounded p-3 text-sm">
                        <span className="text-gray-700 capitalize">{sub.submitted_by_team_role} team captain</span>
                        <span className="font-mono font-semibold">
                          {sub.home_team_score} – {sub.away_team_score}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(sub.submitted_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-6 pb-4">
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
