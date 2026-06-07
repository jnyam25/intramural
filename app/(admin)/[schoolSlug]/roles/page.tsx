import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { RoleGrantForm } from "./RoleGrantForm";
import { RevokeRoleButton } from "@/components/admin/RevokeRoleButton";

const ROLE_LABELS: Record<string, string> = {
  school_admin:  "School Admin",
  sports_admin:  "Sports Admin",
  league_admin:  "League Admin",
  coach:         "Coach",
  referee:       "Referee",
  captain:       "Captain",
  participant:   "Participant",
};

export default async function RolesPage({ params }: { params: { schoolSlug: string } }) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "school:assign_roles")) {
    redirect(`/dashboard`);
  }

  const db = await getScopedDb(session.schoolId);

  // Fetch active role assignments
  const assignments = await db
    .collection("role_assignments")
    .find({ revoked_at: { $exists: false } })
    .toArray();

  const userIds = assignments
    .map((a: any) => a.user_id)
    .filter((id: string) => ObjectId.isValid(id));

  const users = userIds.length
    ? await db
        .collection("users")
        .find({ _id: { $in: userIds.map((id: string) => new ObjectId(id)) } })
        .toArray()
    : [];

  const userMap = Object.fromEntries(users.map((u: any) => [u._id.toString(), u]));

  // Fetch sports for scope display and the grant form dropdown
  const rawDb = await getDb();
  const sports = await rawDb
    .collection("sports")
    .find({
      $or: [
        { school_id: session.schoolId },
        { school_id: null },
        { school_id: { $exists: false } },
      ],
      is_active: true,
    })
    .sort({ name: 1 })
    .toArray();

  const sportMap = Object.fromEntries(sports.map((s: any) => [s._id.toString(), s.name as string]));
  const sportsForForm = sports.map((s: any) => ({ id: s._id.toString(), name: s.name as string }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-white">Role Management</h1>
          <p className="text-body mt-1">Assign and revoke school-scoped permissions.</p>
        </div>
        <span className="badge-info">{assignments.length} active</span>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-800 bg-white/[0.03]">
          <h2 className="heading-sm text-white">Active Assignments</h2>
          <p className="text-caption mt-1">Current role grants for this school.</p>
        </div>

        {assignments.length === 0 ? (
          <p className="p-6 text-caption">No role assignments found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Scope</th>
                <th>Granted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => {
                const user = userMap[a.user_id];
                const scopeLabel = a.scope?.sport_id
                  ? `Sport: ${sportMap[a.scope.sport_id] ?? a.scope.sport_id}`
                  : a.scope?.league_id
                  ? `League: ${a.scope.league_id}`
                  : a.scope?.team_id
                  ? `Team: ${a.scope.team_id}`
                  : "School-wide";

                return (
                  <tr key={a._id.toString()}>
                    <td>
                      <div className="font-medium text-gray-200">
                        {user
                          ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email
                          : a.user_id}
                      </div>
                      <div className="font-mono text-xs text-gray-500">{user?.email ?? a.user_id}</div>
                    </td>
                    <td>
                      <span
                        className={
                          a.role === "school_admin"
                            ? "badge-success"
                            : a.role.includes("admin")
                            ? "badge-info"
                            : "badge-neutral"
                        }
                      >
                        {ROLE_LABELS[a.role] ?? a.role}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">{scopeLabel}</td>
                    <td className="text-xs text-gray-500">
                      {new Date(a.granted_at).toLocaleDateString()}
                    </td>
                    <td>
                      <RevokeRoleButton assignmentId={a._id.toString()} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <RoleGrantForm
        schoolSlug={params.schoolSlug}
        sports={sportsForForm}
        assignments={assignments.map((a: any) => ({
          id: a._id.toString(),
          role: a.role,
          userId: a.user_id,
        }))}
      />
    </div>
  );
}
