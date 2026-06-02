import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  draft:        { label: "Draft",        classes: "bg-gray-100 text-gray-600" },
  registration: { label: "Registration", classes: "bg-blue-100 text-blue-800" },
  active:       { label: "Active",       classes: "bg-green-100 text-green-800" },
  completed:    { label: "Completed",    classes: "bg-gray-200 text-gray-600" },
  archived:     { label: "Archived",     classes: "bg-gray-100 text-gray-400" },
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Leagues & Standings</h1>

      {leagues.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No active leagues at this time.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {leagues.map((league: any) => {
            const status = STATUS_LABELS[league.status] ?? { label: league.status, classes: "bg-gray-100 text-gray-600" };
            return (
              <li key={league._id.toString()}>
                <Link
                  href={`/leagues/${league._id.toString()}`}
                  className="flex items-center justify-between bg-white rounded-lg shadow px-6 py-4 hover:shadow-md transition-shadow"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{league.name}</p>
                    <p className="text-sm text-gray-500">{league.season}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${status.classes}`}>
                    {status.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
