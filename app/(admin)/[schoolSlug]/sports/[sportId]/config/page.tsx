import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { ScoringConfigForm } from "./ScoringConfigForm";

export default async function SportConfigPage({
  params,
}: {
  params: { schoolSlug: string; sportId: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (
    !hasPermission(session.assignments, "sport:configure_scoring", params.sportId, "sport") &&
    !hasPermission(session.assignments, "sport:configure_rules", params.sportId, "sport")
  ) {
    redirect("/dashboard");
  }

  const globalDb = await getDb();
  const sport = await globalDb
    .collection("sports")
    .findOne({ _id: new ObjectId(params.sportId) } as any);

  if (!sport) notFound();

  const db = await getScopedDb(session.schoolId);
  const scoringSystems = await db.collection("scoring_systems").find({}).toArray();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {(sport as any).name} — Scoring & Rules
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure scoring rules for this sport at your school.
        </p>
      </div>

      {/* Current Sport Details */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-gray-700">Sport Defaults</h2>
        </div>
        <dl className="px-6 py-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Team size</dt>
            <dd className="font-medium text-gray-900">
              {(sport as any).default_team_size_min}–{(sport as any).default_team_size_max} players
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Match duration</dt>
            <dd className="font-medium text-gray-900">
              {(sport as any).default_match_duration_minutes} min
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Requires referee</dt>
            <dd className="font-medium text-gray-900">
              {(sport as any).requires_referee ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Allows ties</dt>
            <dd className="font-medium text-gray-900">
              {(sport as any).allows_ties ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Scoring Systems */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Scoring Systems</h2>
        {scoringSystems.length === 0 ? (
          <p className="text-sm text-gray-500">No scoring systems configured for this school yet.</p>
        ) : (
          <ul className="space-y-3">
            {scoringSystems.map((s: any) => (
              <li key={s._id.toString()} className="border border-gray-200 rounded-lg p-4">
                <p className="font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Win: {s.points.win} pts · Tie: {s.points.tie} pts · Loss: {s.points.loss} pts
                  {s.points.forfeit_loss !== undefined && ` · Forfeit: ${s.points.forfeit_loss} pts`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tiebreakers: {(s.tiebreakers ?? []).join(", ") || "none"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ScoringConfigForm sportId={params.sportId} />
    </div>
  );
}
