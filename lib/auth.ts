import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { getDb } from "@/lib/mongodb";
import { RoleAssignmentDbSchema } from "@/lib/validations/school";
import { z } from "zod";

export async function getSession() {
  return getServerSession(authOptions);
}

export type SessionWithRoles = {
  userId: string;
  schoolId: string;
  schoolIds: string[];
  roles: Array<z.infer<typeof RoleAssignmentDbSchema>["role"]>;
  sportIds: string[];
  leagueIds: string[];
  teamIds: string[];
  assignments: Array<z.infer<typeof RoleAssignmentDbSchema>>;
  legacyRole?: string;
};

export async function getSessionWithRoles(): Promise<SessionWithRoles | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const db = await getDb();
  const assignments = (await db
    .collection("role_assignments")
    .find({ user_id: session.user.id, revoked_at: { $exists: false } })
    .toArray()) as unknown as z.infer<typeof RoleAssignmentDbSchema>[];

  const schoolIds = Array.from(
    new Set(assignments.map((assignment) => assignment.school_id).filter(Boolean))
  );
  const sportIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.scope?.sport_id)
        .filter((id): id is string => id !== undefined)
    )
  );
  const leagueIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.scope?.league_id)
        .filter((id): id is string => id !== undefined)
    )
  );
  const teamIds = Array.from(
    new Set(
      assignments
        .map((assignment) => assignment.scope?.team_id)
        .filter((id): id is string => id !== undefined)
    )
  );

  return {
    userId: session.user.id,
    schoolId: schoolIds[0] ?? "",
    schoolIds,
    roles: Array.from(new Set(assignments.map((assignment) => assignment.role))),
    sportIds,
    leagueIds,
    teamIds,
    assignments,
    legacyRole: (session.user as { role?: string }).role,
  };
}
