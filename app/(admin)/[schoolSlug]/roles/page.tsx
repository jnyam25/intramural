import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import { RoleGrantForm } from "./RoleGrantForm";

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  sports_admin: "Sports Admin",
  league_admin: "League Admin",
  coach: "Coach",
  referee: "Referee",
  captain: "Captain",
  participant: "Participant",
};

export default async function RolesPage({ params }: { params: { schoolSlug: string } }) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "school:assign_roles")) {
    redirect(`/dashboard`);
  }

  const db = await getScopedDb(session.schoolId);
  const assignments = await db.collection("role_assignments").find({
    revoked_at: { $exists: false },
  }).toArray();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
      </div>

      {/* Active Assignments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Active Assignments</h2>
          <p className="text-sm text-gray-500 mt-1">{assignments.length} active role assignment(s)</p>
        </div>

        {assignments.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No role assignments found.</p>
        ) : (
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">User ID</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Scope</th>
                <th className="px-6 py-3 text-left">Granted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map((a: any) => (
                <tr key={a._id.toString()} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{a.user_id}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-full font-medium">
                      {ROLE_LABELS[a.role] ?? a.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {a.scope?.league_id ? `League: ${a.scope.league_id}` : ""}
                    {a.scope?.team_id ? `Team: ${a.scope.team_id}` : ""}
                    {!a.scope?.league_id && !a.scope?.team_id ? "School-wide" : ""}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {new Date(a.granted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Grant Role Form */}
      <RoleGrantForm schoolSlug={params.schoolSlug} />
    </div>
  );
}
