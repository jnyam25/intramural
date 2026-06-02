import { getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SchoolAdminPage({ params }: { params: { schoolSlug: string } }) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "school:view_all_reports")) {
    redirect(`/${params.schoolSlug}/dashboard`);
  }

  const scopedDb = await getScopedDb(session.schoolId);

  const [totalParticipants, activeLeagues, pendingDisputes] = await Promise.all([
    scopedDb.collection("users").countDocuments({}),
    scopedDb.collection("leagues").countDocuments({ status: "active" }),
    scopedDb.collection("matches").countDocuments({ status: "disputed" }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">School Administration</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Participants" value={totalParticipants} icon="👥" />
        <StatCard title="Active Leagues" value={activeLeagues} icon="🏆" />
        <StatCard title="Pending Disputes" value={pendingDisputes} icon="⚠️" highlight={pendingDisputes > 0} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <ActionButton href={`/${params.schoolSlug}/admin/roles`} label="Assign Roles" />
          <ActionButton href={`/${params.schoolSlug}/admin/audit`} label="View Audit Logs" />
          <ActionButton href={`/${params.schoolSlug}/admin/settings`} label="School Settings" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: number;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 flex items-center gap-4 ${highlight ? "border-l-4 border-red-500" : ""}`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
    >
      {label}
    </Link>
  );
}
