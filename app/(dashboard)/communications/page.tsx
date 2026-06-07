import { getSessionWithRoles } from "@/lib/auth";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { BroadcastForm } from "@/components/communications/BroadcastForm";

interface MongoRosterMember {
  user_id: string;
  status: "pending" | "approved" | "rejected";
}

interface MongoTeam {
  _id: ObjectId;
  name: string;
  roster: MongoRosterMember[];
}

interface MongoUser {
  _id: ObjectId;
  first_name?: string;
  last_name?: string;
  email: string;
}

interface MongoRoleAssignment {
  _id: ObjectId;
  scope?: { team_id?: string };
}

export default async function CommunicationsPage() {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");
  if (!session.roles.includes("coach")) redirect("/dashboard");

  const { userId, schoolId } = session;
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);

  const rawCoachAssignments = await db.collection("role_assignments").find({
    user_id: userId, role: "coach", revoked_at: { $exists: false },
  }).toArray();
  const coachAssignments = rawCoachAssignments as unknown as MongoRoleAssignment[];
  const scopedTeamIds = coachAssignments
    .map((a) => a.scope?.team_id)
    .filter((id): id is string => !!id);

  const rawTeams = scopedTeamIds.length
    ? await db.collection("teams").find({ _id: { $in: scopedTeamIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const coachedTeams = rawTeams as unknown as MongoTeam[];

  const allUserIds = Array.from(
    new Set(
      coachedTeams.flatMap((t) =>
        t.roster.filter((m) => m.status === "approved").map((m) => m.user_id)
      )
    )
  );

  const rawUsers = allUserIds.length
    ? await db.collection("users").find({ _id: { $in: allUserIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const userDocs = rawUsers as unknown as MongoUser[];

  const userNameMap: Record<string, string> = {};
  for (const u of userDocs) {
    userNameMap[u._id.toString()] =
      `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email;
  }

  const teams = coachedTeams.map((t) => {
    const approvedRoster = t.roster.filter((m) => m.status === "approved");
    return {
      id: t._id.toString(),
      name: t.name,
      memberCount: approvedRoster.length,
      roster: approvedRoster.map((m) => ({
        id: m.user_id,
        name: userNameMap[m.user_id] ?? m.user_id,
      })),
    };
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <header>
        <h1 className="heading-md text-white">Communications</h1>
        <p className="text-body mt-1">Send messages to your team members.</p>
      </header>
      <BroadcastForm teams={teams} />
    </div>
  );
}
