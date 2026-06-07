import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_BADGES: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  draft: {
    label: "Draft",
    badgeClass: "badge-neutral",
    icon: <DraftIcon />
  },
  registration: {
    label: "Registration",
    badgeClass: "badge-info",
    icon: <RegistrationIcon />
  },
  active: {
    label: "Active",
    badgeClass: "badge-success",
    icon: <ActiveIcon />
  },
  completed: {
    label: "Completed",
    badgeClass: "badge-neutral",
    icon: <CompleteIcon />
  },
  archived: {
    label: "Archived",
    badgeClass: "badge-neutral",
    icon: <ArchiveIcon />
  },
};

export default async function LeaguesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);

  const leagues = await db
    .collection("leagues")
    .find({ status: { $in: ["registration", "active"] } })
    .toArray();

  // Get team counts for each league
  const leaguesWithStats = await Promise.all(
    leagues.map(async (league: any) => {
      const teamCount = await db.collection("teams").countDocuments({ league_id: league._id.toString() });
      const matchCount = await db.collection("matches").countDocuments({ league_id: league._id.toString() });
      const maxTeams = league.max_teams ?? league.capacity ?? 12;
      const registrationProgress = Math.min(100, Math.round((teamCount / Math.max(1, maxTeams)) * 100));
      return { ...league, teamCount, matchCount, maxTeams, registrationProgress };
    })
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-white">Leagues & Standings</h1>
          <p className="text-body mt-1">View active leagues and team standings</p>
        </div>
        <div className="flex gap-2">
          <span className="badge-success">{leagues.length} Active</span>
        </div>
      </div>

      {leagues.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface flex items-center justify-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 17 10 5 10-5M12 2v20"/></svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No active leagues</h3>
          <p className="text-caption mb-6">Check back later for upcoming leagues</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {leaguesWithStats.map((league: any) => {
            const status = STATUS_BADGES[league.status] ?? STATUS_BADGES.draft;
            return (
              <Link
                key={league._id.toString()}
                href={`/leagues/${league._id.toString()}`}
                className="card p-6 group hover:border-volt/30 hover:-translate-y-1 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${league.status === "registration" ? "bg-cyber/10 text-cyber" : "bg-volt/10 text-volt"}`}>
                      {status.icon}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white text-lg group-hover:text-volt transition-colors">
                        {league.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">{league.season}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <UsersIconSmall />
                          {league.teamCount || 0} teams
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MatchIconSmall />
                          {league.matchCount || 0} matches
                        </span>
                      </div>
                      {league.status === "registration" && (
                        <div className="mt-5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Registration</span>
                            <span className="text-cyber">{league.teamCount || 0}/{league.maxTeams} teams</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-bar-fill bg-cyber" style={{ width: `${league.registrationProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={status.badgeClass}>
                      {status.label}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-600 group-hover:text-volt transition-colors"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Icons
function DraftIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>;
}

function RegistrationIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>;
}

function ActiveIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>;
}

function CompleteIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
}

function ArchiveIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 17 10 5 10-5M12 2v20"/></svg>;
}

function UsersIconSmall() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
}

function MatchIconSmall() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20"/></svg>;
}
