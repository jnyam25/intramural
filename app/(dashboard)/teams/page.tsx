import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);
  const userId = session.user.id;

  const teams = await db.collection("teams").find({ "roster.user_id": userId }).toArray();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>

      {teams.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">You are not on any teams yet.</p>
          <p className="text-sm text-gray-400">
            Use an invite link from a captain to join a team, or create your own.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {teams.map((team: any) => (
            <li key={team._id.toString()}>
              <Link
                href={`/teams/${team._id.toString()}`}
                className="flex items-center justify-between bg-white rounded-lg shadow px-6 py-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-semibold text-gray-900">{team.name}</p>
                  <p className="text-sm text-gray-500">
                    {team.roster?.length ?? 0} player{team.roster?.length !== 1 ? "s" : ""}
                    {team.captain_user_id === userId && " · Captain"}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                    team.status === "approved"
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {team.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
