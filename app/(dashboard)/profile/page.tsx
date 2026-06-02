import { getSession, getSessionWithRoles } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  sports_admin: "Sports Admin",
  league_admin: "League Admin",
  coach: "Coach",
  referee: "Referee",
  captain: "Captain",
  participant: "Participant",
};

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const sessionWithRoles = await getSessionWithRoles();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile & Settings</h1>

      {/* Account Info */}
      <section className="bg-white rounded-lg shadow divide-y divide-gray-100">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Account</h2>
        </div>
        <div className="px-6 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
            {(session.user.name ?? session.user.email ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{session.user.name ?? "—"}</p>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
        </div>
      </section>

      {/* Roles */}
      {sessionWithRoles && sessionWithRoles.roles.length > 0 && (
        <section className="bg-white rounded-lg shadow divide-y divide-gray-100">
          <div className="px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Assigned Roles
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {sessionWithRoles.assignments.map((assignment: any, i: number) => (
              <li key={i} className="px-6 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">
                  {ROLE_LABELS[assignment.role] ?? assignment.role}
                </span>
                <div className="flex gap-2 text-xs text-gray-400">
                  {assignment.scope?.league_id && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                      League scoped
                    </span>
                  )}
                  {assignment.scope?.team_id && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                      Team scoped
                    </span>
                  )}
                  {!assignment.scope?.league_id && !assignment.scope?.team_id && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                      School-wide
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Actions */}
      <section className="bg-white rounded-lg shadow divide-y divide-gray-100">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Actions</h2>
        </div>
        <div className="px-6 py-4">
          <Link
            href="/api/auth/signout"
            className="text-sm text-red-600 hover:text-red-800 transition-colors"
          >
            Sign out of all sessions
          </Link>
        </div>
      </section>
    </div>
  );
}
