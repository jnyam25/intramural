import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  registration: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-200 text-gray-500",
  archived: "bg-gray-100 text-gray-400",
};

const STATUS_FILTERS = ["all", "draft", "registration", "active", "completed", "archived"];

export default async function AdminLeaguesListPage({
  params,
  searchParams,
}: {
  params: { schoolSlug: string };
  searchParams: { status?: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (
    !hasPermission(session.assignments, "league:create") &&
    !hasPermission(session.assignments, "league:manage_any")
  ) {
    redirect("/dashboard");
  }

  const db = await getScopedDb(session.schoolId);

  const statusFilter = searchParams.status && searchParams.status !== "all"
    ? { status: searchParams.status }
    : {};

  const leagues = await db
    .collection("leagues")
    .find(statusFilter)
    .sort({ created_at: -1 })
    .toArray();

  const leaguesWithCounts = await Promise.all(
    leagues.map(async (l: any) => {
      const teamCount = await db
        .collection("teams")
        .countDocuments({ league_id: l._id.toString() });
      return { ...l, teamCount };
    })
  );

  const activeFilter = searchParams.status ?? "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leagues</h1>
          <p className="text-sm text-gray-400 mt-1">{leagues.length} league{leagues.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href={`/${params.schoolSlug}/leagues/create`}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Create League
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/${params.schoolSlug}/leagues?status=${s}`}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              activeFilter === s
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Leagues table */}
      {leaguesWithCounts.length === 0 ? (
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-12 text-center">
          <p className="text-gray-400 text-sm">No leagues found.</p>
          <Link
            href={`/${params.schoolSlug}/leagues/create`}
            className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            Create your first league
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">League</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Season</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Teams</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leaguesWithCounts.map((l: any) => (
                <tr key={l._id.toString()} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{l.name}</p>
                      {l.division && <p className="text-xs text-gray-500 mt-0.5">{l.division}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{l.season}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[l.status] ?? ""}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{l.teamCount}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/${params.schoolSlug}/leagues/${l._id.toString()}`}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-medium mr-4"
                    >
                      Manage
                    </Link>
                    <Link
                      href={`/${params.schoolSlug}/leagues/${l._id.toString()}/edit`}
                      className="text-gray-400 hover:text-gray-300 text-xs"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
