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

  const [totalParticipants, activeLeagues, pendingDisputes, totalMatches] = await Promise.all([
    scopedDb.collection("users").countDocuments({}),
    scopedDb.collection("leagues").countDocuments({ status: "active" }),
    scopedDb.collection("matches").countDocuments({ status: "disputed" }),
    scopedDb.collection("matches").countDocuments({}),
  ]);

  // Sample activity data
  const recentActivity = [
    { id: 1, type: "match", message: "Match completed: Thunderbolts vs Hawks", time: "2 hours ago", icon: "trophy" },
    { id: 2, type: "registration", message: "5 new players registered", time: "4 hours ago", icon: "users" },
    { id: 3, type: "alert", message: "Field 3 maintenance delayed", time: "5 hours ago", icon: "alert" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with FAB */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-white">School Administration</h1>
          <p className="text-body mt-1">Manage leagues, users, and settings</p>
        </div>
        <Link
          href={`/${params.schoolSlug}/admin/leagues/create`}
          className="btn-primary shadow-glow-volt"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Create League
        </Link>
      </div>

      {/* Live Activity Ticker */}
      <div className="card p-4 border-l-4 border-l-cyber">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyber animate-pulse" />
          <span className="text-sm text-cyber font-medium">Live Activity</span>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-8 animate-marquee whitespace-nowrap">
              {recentActivity.map((item) => (
                <span key={item.id} className="text-sm text-gray-400">
                  <span className="text-gray-500">{item.time}:</span> {item.message}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Participants"
          value={totalParticipants}
          trend="+12%"
          icon={<UsersIcon />}
          color="volt"
        />
        <StatCard
          title="Active Leagues"
          value={activeLeagues}
          trend="Active"
          icon={<TrophyIcon />}
          color="cyber"
        />
        <StatCard
          title="Pending Disputes"
          value={pendingDisputes}
          trend={pendingDisputes > 0 ? "Action needed" : "All clear"}
          icon={<AlertIcon />}
          color={pendingDisputes > 0 ? "hyper" : "gray"}
          highlight={pendingDisputes > 0}
        />
        <StatCard
          title="Total Matches"
          value={totalMatches}
          trend="This season"
          icon={<MatchIcon />}
          color="volt"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="heading-sm text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ActionButton
                href={`/${params.schoolSlug}/admin/roles`}
                label="Assign Roles"
                description="Manage user permissions"
                icon={<ShieldIcon />}
              />
              <ActionButton
                href={`/${params.schoolSlug}/admin/waivers`}
                label="View Waivers"
                description="Compliance & signatures"
                icon={<FileIcon />}
              />
              <ActionButton
                href={`/${params.schoolSlug}/admin/leagues`}
                label="Manage Leagues"
                description="Configure seasons"
                icon={<SettingsIcon />}
              />
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-sm text-white">Recent Activity</h2>
              <Link href={`/${params.schoolSlug}/admin/audit`} className="text-sm text-volt hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.type === "alert" ? "bg-hyper/10 text-hyper" :
                    item.type === "match" ? "bg-volt/10 text-volt" :
                    "bg-cyber/10 text-cyber"
                  }`}>
                    {item.icon === "alert" && <AlertIconSmall />}
                    {item.icon === "trophy" && <TrophyIconSmall />}
                    {item.icon === "users" && <UsersIconSmall />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-200">{item.message}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-white mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Database</span>
                <span className="badge-success text-xs">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Auth Service</span>
                <span className="badge-success text-xs">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Email Queue</span>
                <span className="badge-neutral text-xs">12 pending</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-white mb-4">Resources</h3>
            <div className="space-y-2">
              <Link href="#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-volt transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                Documentation
              </Link>
              <Link href="#" className="flex items-center gap-2 text-sm text-gray-400 hover:text-volt transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  trend,
  icon,
  color,
  highlight = false,
}: {
  title: string;
  value: number;
  trend: string;
  icon: React.ReactNode;
  color: "volt" | "cyber" | "hyper" | "gray";
  highlight?: boolean;
}) {
  const colorClasses = {
    volt: "text-volt bg-volt/10 border-volt/20",
    cyber: "text-cyber bg-cyber/10 border-cyber/20",
    hyper: "text-hyper bg-hyper/10 border-hyper/20",
    gray: "text-gray-400 bg-gray-800/50 border-gray-700",
  };

  return (
    <div className={`card p-6 ${highlight ? "border-l-4 border-l-hyper" : ""}`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className={`text-xs font-medium ${color === "hyper" ? "text-hyper" : "text-gray-500"}`}>
          {trend}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-caption mt-1">{title}</p>
      </div>
      <div className="mt-4 progress-bar">
        <div
          className={`progress-bar-fill ${color === "hyper" ? "bg-hyper" : color === "cyber" ? "bg-cyber" : ""}`}
          style={{ width: `${Math.min(100, (value / 50) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-4 rounded-xl bg-surface border border-gray-700 hover:border-gray-600 hover:bg-surface-elevated transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-volt/10 text-volt flex items-center justify-center group-hover:bg-volt/20 transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-medium text-white group-hover:text-volt transition-colors">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

// Icons
function UsersIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
function TrophyIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
}
function AlertIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
}
function MatchIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/><path d="M2 12h20"/></svg>;
}
function ShieldIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function FileIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function SettingsIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function UsersIconSmall() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>;
}
function TrophyIconSmall() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/></svg>;
}
function AlertIconSmall() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/></svg>;
}
