import { getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { IncidentReportForm } from "@/components/incidents/IncidentReportForm";

interface MongoMatch {
  _id: ObjectId;
  home_team_id: string;
  away_team_id: string;
  scheduled_at?: Date;
}

interface MongoTeam {
  _id: ObjectId;
  name: string;
}

export default async function NewIncidentPage() {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");
  if (!session.roles.includes("referee")) redirect("/dashboard");

  const { userId, schoolId } = session;
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);

  const rawMatches = await db
    .collection("matches")
    .find({ referee_user_id: userId, status: { $in: ["in_progress", "completed", "scheduled"] } })
    .sort({ scheduled_at: -1 })
    .limit(20)
    .toArray();
  const recentMatches = rawMatches as unknown as MongoMatch[];

  const teamIds = Array.from(new Set(
    recentMatches.flatMap((m) => [m.home_team_id, m.away_team_id]).filter(Boolean)
  ));

  const rawTeams = teamIds.length
    ? await db.collection("teams").find({ _id: { $in: teamIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const teams = rawTeams as unknown as MongoTeam[];

  const teamMap: Record<string, string> = {};
  for (const t of teams) teamMap[t._id.toString()] = t.name;

  const matchOptions = recentMatches.map((m) => {
    const home = teamMap[m.home_team_id] ?? "Home";
    const away = teamMap[m.away_team_id] ?? "Away";
    const date = m.scheduled_at
      ? new Date(m.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";
    return { id: m._id.toString(), label: `${home} vs ${away}${date ? ` · ${date}` : ""}` };
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <header>
        <h1 className="heading-md text-white">File Incident Report</h1>
        <p className="text-body mt-1">Document any incidents that occurred during a match.</p>
      </header>
      <IncidentReportForm matches={matchOptions} />
    </div>
  );
}
