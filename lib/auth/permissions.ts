import { z } from "zod";
import { RoleAssignmentDbSchema } from "@/lib/validations/school";

export type RoleAssignment = z.infer<typeof RoleAssignmentDbSchema>;
export type PermissionResourceType = "sport" | "league" | "team" | "school" | "match" | "score_submission";

export const ROLE_PERMISSIONS: Record<RoleAssignment["role"], string[]> = {
  platform_admin: ["*"], // All permissions
  school_admin: [
    "school:manage_settings",
    "school:assign_roles",
    "school:view_all_reports",
    "league:create",
    "league:manage_any",
    "school:manage_leagues",
    "sport:configure_rules",
    "sport:configure_scoring",
    "referee:assign",
  ],
  sports_admin: [
    "sport:configure_rules",
    "sport:configure_scoring",
    "league:create_for_sport",
    "league:manage_for_sport",
    "referee:assign",
  ],
  league_admin: [
    "league:manage",
    "school:manage_leagues",
    "team:approve",
    "match:schedule",
    "score:resolve_dispute",
  ],
  coach: ["team:manage_roster", "team:communicate", "match:attend"],
  referee: ["match:officiate", "score:submit_official", "incident:report"],
  captain: ["team:manage_roster", "team:invite", "score:submit"],
  participant: ["self:register", "self:sign_waiver", "self:view_schedule"],
};

export function hasPermission(
  roles: RoleAssignment[],
  permission: string,
  resourceId?: string,
  resourceType?: PermissionResourceType
): boolean {
  for (const assignment of roles) {
    // Platform admin has all permissions
    if (assignment.role === "platform_admin") return true;
    
    const rolePerms = ROLE_PERMISSIONS[assignment.role] || [];
    
    // Check if role has the permission or wildcard
    const hasPerm = rolePerms.includes(permission) || 
                    rolePerms.includes(permission.split(":")[0] + ":*") ||
                    rolePerms.includes("*");
    
    if (!hasPerm) continue;

    // Check scope match
    if (resourceType && resourceId) {
      if (resourceType === "sport" && assignment.scope?.sport_id !== resourceId) continue;
      if (resourceType === "league" && assignment.scope?.league_id !== resourceId) continue;
      if (resourceType === "team" && assignment.scope?.team_id !== resourceId) continue;
    }

    return true;
  }

  return false;
}
