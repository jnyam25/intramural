import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";
import { EditLeagueForm } from "./EditLeagueForm";

export default async function EditLeaguePage({
  params,
}: {
  params: { schoolSlug: string; leagueId: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (
    !hasPermission(session.assignments, "league:manage_any") &&
    !hasPermission(session.assignments, "league:manage", params.leagueId, "league")
  ) {
    redirect("/dashboard");
  }

  const db = await getScopedDb(session.schoolId);
  const league = await db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) });
  if (!league) notFound();

  const l = league as any;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href={`/${params.schoolSlug}/leagues/${params.leagueId}`}
          className="text-gray-400 hover:text-gray-300 text-sm"
        >
          ← Back to League
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Edit: {l.name}</h1>
        <p className="text-sm text-gray-400 mt-1">Season {l.season}</p>
      </div>

      <EditLeagueForm
        schoolSlug={params.schoolSlug}
        league={{
          _id: l._id.toString(),
          name: l.name,
          division: l.division ?? undefined,
          max_roster_size: l.max_roster_size,
          start_date: l.start_date?.toISOString(),
          end_date: l.end_date?.toISOString(),
          status: l.status,
        }}
      />
    </div>
  );
}
