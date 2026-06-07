import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreateLeagueForm } from "./CreateLeagueForm";

export default async function CreateLeaguePage({
  params,
}: {
  params: { schoolSlug: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "league:create")) {
    redirect("/dashboard");
  }

  const db = await getScopedDb(session.schoolId);
  const [sports, scoringSystems] = await Promise.all([
    db.collection("sports").find({}).sort({ name: 1 }).toArray(),
    db.collection("scoring_systems").find({}).sort({ name: 1 }).toArray(),
  ]);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/${params.schoolSlug}/leagues`} className="text-gray-400 hover:text-gray-300 text-sm">
          ← Leagues
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">Create League</h1>
        <p className="text-sm text-gray-400 mt-1">New leagues start in Draft status. Advance to Registration when ready for teams to sign up.</p>
      </div>

      <CreateLeagueForm
        schoolSlug={params.schoolSlug}
        sports={sports.map((s: any) => ({ _id: s._id.toString(), name: s.name }))}
        scoringSystems={scoringSystems.map((ss: any) => ({ _id: ss._id.toString(), name: ss.name }))}
      />
    </div>
  );
}
