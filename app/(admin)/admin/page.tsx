import { getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped";
import { hasPermission } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "school:view_all_reports")) {
    redirect("/dashboard");
  }

  const scopedDb = await getScopedDb(session.schoolId);

  // Gather stats
  const [
    totalParticipants,
    activeLeagues,
    pendingDisputes,
    totalMatches,
    pendingApprovals,
    recentAuditLogs,
  ] = await Promise.all([
    scopedDb.collection("users").countDocuments({}),
    scopedDb.collection("leagues").countDocuments({ status: "active" }),
    scopedDb.collection("matches").countDocuments({ status: "disputed" }),
    scopedDb.collection("matches").countDocuments({}),
    scopedDb.collection("teams").countDocuments({
      "roster.status": "pending",
    }),
    scopedDb
      .collection("audit_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray(),
  ]);

  // Format audit logs
  const auditLogActions: Record<string, { icon: string; color: string }> = {
    USER_REGISTERED: { icon: "👤", color: "text-cyber" },
    TEAM_CREATED: { icon: "🏆", color: "text-volt" },
    ROSTER_APPROVED: { icon: "✓", color: "text-volt" },
    WAIVER_SIGNED: { icon: "📝", color: "text-cyber" },
    SCORE_SUBMITTED: { icon: "📊", color: "text-hyper" },
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-white">School Administration</h1>
          <p className="text-body mt-1">Manage leagues, users, and settings</p>
        </div>
        <Link
          href="/admin/audit-logs"
          className="btn-secondary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          Audit Logs
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 border-l-4 border-l-volt">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption">Total Participants</p>
              <p className="text-3xl font-bold text-white mt-1">{totalParticipants}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-volt/10 flex items-center justify-center text-volt">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-cyber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption">Active Leagues</p>
              <p className="text-3xl font-bold text-white mt-1">{activeLeagues}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyber/10 flex items-center justify-center text-cyber">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-hyper">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption">Pending Disputes</p>
              <p className="text-3xl font-bold text-white mt-1">{pendingDisputes}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-hyper/10 flex items-center justify-center text-hyper">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            </div>
          </div>
        </div>

        <div className="card p-6 border-l-4 border-l-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption">Total Matches</p>
              <p className="text-3xl font-bold text-white mt-1">{totalMatches}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {pendingApprovals > 0 && (
        <div className="card p-4 border border-hyper/30 bg-hyper/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-hyper/20 flex items-center justify-center text-hyper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            </div>
            <div>
              <p className="font-medium text-white">
                {pendingApprovals} roster {pendingApprovals === 1 ? "request" : "requests"} pending approval
              </p>
              <p className="text-sm text-gray-400">
                Team captains need to review join requests
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/leagues" className="card p-6 hover:border-volt/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-volt/10 flex items-center justify-center text-volt mb-4 group-hover:bg-volt/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>
          </div>
          <h3 className="font-display font-semibold text-white mb-1">Manage Leagues</h3>
          <p className="text-caption">Create, edit, and view all leagues</p>
        </Link>

        <Link href="/admin/schedule" className="card p-6 hover:border-cyber/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-cyber/10 flex items-center justify-center text-cyber mb-4 group-hover:bg-cyber/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <h3 className="font-display font-semibold text-white mb-1">Auto-Schedule</h3>
          <p className="text-caption">Generate match schedules automatically</p>
        </Link>

        <Link href="/admin/eligibility" className="card p-6 hover:border-hyper/50 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-hyper/10 flex items-center justify-center text-hyper mb-4 group-hover:bg-hyper/20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
          </div>
          <h3 className="font-display font-semibold text-white mb-1">Eligibility</h3>
          <p className="text-caption">Verify student enrollment status</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="heading-sm text-white">Recent Activity</h2>
          <Link href="/admin/audit-logs" className="text-sm text-volt hover:underline">
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {recentAuditLogs.map((log: any) => {
            const actionMeta = auditLogActions[log.action] || { icon: "•", color: "text-gray-400" };
            return (
              <div key={log._id.toString()} className="px-6 py-4 flex items-center gap-4">
                <span className={`text-lg ${actionMeta.color}`}>{actionMeta.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">
                    {log.action.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-gray-600">
                  {log.actor_user_id === log.entity_id ? "Self" : log.actor_user_id.slice(-6)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
