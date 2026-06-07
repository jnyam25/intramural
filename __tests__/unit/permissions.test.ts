import { hasPermission, ROLE_PERMISSIONS, type RoleAssignment } from "@/lib/auth/permissions";

function makeAssignment(
  role: RoleAssignment["role"],
  scope?: { sport_id?: string; league_id?: string; team_id?: string }
): RoleAssignment {
  return {
    _id: "000000000000000000000001",
    user_id: "user1",
    school_id: "school1",
    role,
    scope: scope ?? {},
    granted_by_user_id: "granter1",
    granted_at: new Date(),
  };
}

describe("hasPermission", () => {
  describe("empty / no assignments", () => {
    it("returns false with no assignments", () => {
      expect(hasPermission([], "league:create")).toBe(false);
    });
  });

  describe("platform_admin wildcard", () => {
    const admin = [makeAssignment("platform_admin")];

    it("grants any permission", () => {
      expect(hasPermission(admin, "league:create")).toBe(true);
      expect(hasPermission(admin, "score:resolve_dispute")).toBe(true);
      expect(hasPermission(admin, "incident:report")).toBe(true);
      expect(hasPermission(admin, "nonexistent:permission")).toBe(true);
    });
  });

  describe("school_admin", () => {
    const schoolAdmin = [makeAssignment("school_admin")];

    it("can create leagues", () => {
      expect(hasPermission(schoolAdmin, "league:create")).toBe(true);
    });

    it("can manage any league", () => {
      expect(hasPermission(schoolAdmin, "league:manage_any")).toBe(true);
    });

    it("can assign roles", () => {
      expect(hasPermission(schoolAdmin, "school:assign_roles")).toBe(true);
    });

    it("can view all reports", () => {
      expect(hasPermission(schoolAdmin, "school:view_all_reports")).toBe(true);
    });

    it("cannot submit scores directly", () => {
      expect(hasPermission(schoolAdmin, "score:submit")).toBe(false);
    });

    it("cannot report incidents (that is a referee permission)", () => {
      expect(hasPermission(schoolAdmin, "incident:report")).toBe(false);
    });
  });

  describe("league_admin", () => {
    const leagueAdmin = [makeAssignment("league_admin", { league_id: "league1" })];

    it("can approve teams", () => {
      expect(hasPermission(leagueAdmin, "team:approve")).toBe(true);
    });

    it("can schedule matches", () => {
      expect(hasPermission(leagueAdmin, "match:schedule")).toBe(true);
    });

    it("can resolve score disputes", () => {
      expect(hasPermission(leagueAdmin, "score:resolve_dispute")).toBe(true);
    });

    it("cannot manage school settings", () => {
      expect(hasPermission(leagueAdmin, "school:manage_settings")).toBe(false);
    });

    it("cannot create new leagues", () => {
      expect(hasPermission(leagueAdmin, "league:create")).toBe(false);
    });

    it("scoped league:manage is in ROLE_PERMISSIONS", () => {
      expect(ROLE_PERMISSIONS.league_admin).toContain("league:manage");
    });
  });

  describe("referee", () => {
    const referee = [makeAssignment("referee")];

    it("can report incidents", () => {
      expect(hasPermission(referee, "incident:report")).toBe(true);
    });

    it("can submit official scores", () => {
      expect(hasPermission(referee, "score:submit_official")).toBe(true);
    });

    it("cannot approve teams", () => {
      expect(hasPermission(referee, "team:approve")).toBe(false);
    });

    it("cannot resolve score disputes (that is league_admin)", () => {
      expect(hasPermission(referee, "score:resolve_dispute")).toBe(false);
    });

    it("cannot manage school settings", () => {
      expect(hasPermission(referee, "school:manage_settings")).toBe(false);
    });
  });

  describe("captain", () => {
    const captain = [makeAssignment("captain", { team_id: "team1" })];

    it("can invite players", () => {
      expect(hasPermission(captain, "team:invite")).toBe(true);
    });

    it("can manage their own roster", () => {
      expect(hasPermission(captain, "team:manage_roster")).toBe(true);
    });

    it("cannot approve teams (that is league_admin)", () => {
      expect(hasPermission(captain, "team:approve")).toBe(false);
    });

    it("cannot schedule matches", () => {
      expect(hasPermission(captain, "match:schedule")).toBe(false);
    });

    it("cannot report incidents (that is referee)", () => {
      expect(hasPermission(captain, "incident:report")).toBe(false);
    });
  });

  describe("participant", () => {
    const participant = [makeAssignment("participant")];

    it("can register themselves", () => {
      expect(hasPermission(participant, "self:register")).toBe(true);
    });

    it("can sign waivers", () => {
      expect(hasPermission(participant, "self:sign_waiver")).toBe(true);
    });

    it("cannot access any admin operation", () => {
      const adminPerms = [
        "league:create",
        "league:manage_any",
        "school:manage_settings",
        "school:assign_roles",
        "school:view_all_reports",
        "team:approve",
        "match:schedule",
        "score:resolve_dispute",
        "incident:report",
      ];
      for (const perm of adminPerms) {
        expect(hasPermission(participant, perm)).toBe(false);
      }
    });
  });

  describe("scope enforcement", () => {
    it("returns true when scope matches requested resource", () => {
      const assignment = makeAssignment("league_admin", { league_id: "league-abc" });
      expect(hasPermission([assignment], "league:manage", "league-abc", "league")).toBe(true);
    });

    it("returns false when scope does not match resource", () => {
      const assignment = makeAssignment("league_admin", { league_id: "league-abc" });
      expect(hasPermission([assignment], "league:manage", "league-xyz", "league")).toBe(false);
    });

    it("returns true when no resourceId is specified (unscoped check)", () => {
      const assignment = makeAssignment("league_admin", { league_id: "league-abc" });
      expect(hasPermission([assignment], "league:manage")).toBe(true);
    });

    it("grants permission if any assignment in the list matches", () => {
      const assignments = [
        makeAssignment("participant"),
        makeAssignment("captain", { team_id: "team1" }),
      ];
      expect(hasPermission(assignments, "team:invite")).toBe(true);
    });

    it("blocks if no assignment in the list grants the permission", () => {
      const assignments = [
        makeAssignment("participant"),
        makeAssignment("coach", { team_id: "team1" }),
      ];
      expect(hasPermission(assignments, "score:resolve_dispute")).toBe(false);
    });
  });

  describe("FERPA-critical: no privilege escalation", () => {
    it("captain cannot escalate to league_admin by having multiple roles", () => {
      const assignments = [
        makeAssignment("captain", { team_id: "team1" }),
        makeAssignment("participant"),
      ];
      expect(hasPermission(assignments, "school:view_all_reports")).toBe(false);
      expect(hasPermission(assignments, "team:approve")).toBe(false);
    });

    it("coach cannot read audit logs or view all reports", () => {
      const coach = [makeAssignment("coach", { team_id: "team1" })];
      expect(hasPermission(coach, "school:view_all_reports")).toBe(false);
    });
  });
});
