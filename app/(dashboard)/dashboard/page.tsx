import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { TeamDashboard } from "@/components/teams/TeamDashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const scopedDb = await getScopedDb(schoolId);
  const userId = session.user.id;
  const displayName = session.user.name ?? session.user.email ?? "there";

  const [pendingLeagues, userTeams] = await Promise.all([
    scopedDb.collection("leagues").find({ status: "registration" }).toArray(),
    scopedDb.collection("teams").find({ "roster.user_id": userId }).toArray(),
  ]);

  const isCaptain = userTeams.some((t: any) => t.captain_user_id === userId);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {displayName}</h1>
        <p className="text-gray-500">Here is what needs your attention today.</p>
      </header>

      {pendingLeagues.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-4">
            Action Required: Pending Waivers
          </h2>
          <p className="text-sm text-red-700 mb-4">
            You must sign the liability waiver to participate in these leagues.
          </p>
          <div className="space-y-2">
            {pendingLeagues.map((league: any) => (
              <a
                key={league._id.toString()}
                href={`/waivers/${league._id.toString()}`}
                className="block px-4 py-2 bg-white border border-red-200 rounded text-sm text-red-800 hover:bg-red-50 transition-colors"
              >
                Sign waiver for: <strong>{league.name}</strong>
              </a>
            ))}
          </div>
        </section>
      )}

      {isCaptain &&
        userTeams
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

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Upcoming Matches</h2>
        <p className="text-gray-500 text-sm">No upcoming matches scheduled.</p>
      </section>
    </div>
  );
}
