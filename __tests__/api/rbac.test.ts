/**
 * RBAC integration tests for key API routes.
 * Tests the full auth + permission guard using real hasPermission logic
 * and mocked session/DB layers.
 *
 * Coverage: 401 (no session), 403 (wrong role), 200/201 (correct role).
 */

import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Auth / DB mocks (declared before any route import so jest.mock hoists them)
// ---------------------------------------------------------------------------

jest.mock("@/lib/auth", () => ({ getSession: jest.fn(), getSessionWithRoles: jest.fn() }));
jest.mock("@/lib/db/school-context", () => ({ getSchoolId: jest.fn() }));
jest.mock("@/lib/db/scoped", () => ({ getScopedDb: jest.fn() }));
jest.mock("@/lib/mongodb", () => ({ getDb: jest.fn() }));

import { getSession, getSessionWithRoles } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { getDb } from "@/lib/mongodb";

const mockGetSession = getSession as jest.Mock;
const mockGetSessionWithRoles = getSessionWithRoles as jest.Mock;
const mockGetSchoolId = getSchoolId as jest.Mock;
const mockGetScopedDb = getScopedDb as jest.Mock;
const mockGetDb = getDb as jest.Mock;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCHOOL_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
const USER_ID   = "bbbbbbbbbbbbbbbbbbbbbbbb";
const MATCH_ID  = "cccccccccccccccccccccccc";
const TEAM_ID   = "dddddddddddddddddddddddd";

function makeSession(userId = USER_ID) {
  return { user: { id: userId, email: "test@example.com" } };
}

const GRANTER_ID = "cccccccccccccccccccccccc";

function makeAssignments(role: string) {
  return [
    {
      _id: "000000000000000000000001",
      user_id: USER_ID,
      school_id: SCHOOL_ID,
      role,
      scope: {},
      granted_by_user_id: GRANTER_ID,
      granted_at: new Date(),
    },
  ];
}

/** Returns a ScopedDb mock where role_assignments returns the given assignments. */
function makeScopedDb(roleAssignments: unknown[], extraCollections: Record<string, unknown> = {}) {
  const defaultColl = {
    find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockResolvedValue(null),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    insertOne: jest.fn().mockResolvedValue({ insertedId: "newid123456789012345678" }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  const roleAssignmentsColl = {
    ...defaultColl,
    find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(roleAssignments) }),
  };

  return {
    collection: jest.fn((name: string) => {
      if (name === "role_assignments") return roleAssignmentsColl;
      if (name in extraCollections) return extraCollections[name];
      return defaultColl;
    }),
  };
}

function makeNextRequest(
  url: string,
  method = "GET",
  body?: unknown
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// Shared setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSchoolId.mockReturnValue(SCHOOL_ID);
});

// ---------------------------------------------------------------------------
// GET /api/admin/waivers — requires school:view_all_reports
// ---------------------------------------------------------------------------

describe("GET /api/admin/waivers", () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    ({ GET } = await import("@/app/api/admin/waivers/route"));
  });

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetScopedDb.mockResolvedValue(makeScopedDb([]));

    const res = await GET(makeNextRequest("http://localhost/api/admin/waivers"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a participant (missing school:view_all_reports)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("participant")));

    const res = await GET(makeNextRequest("http://localhost/api/admin/waivers"));
    expect(res.status).toBe(403);
  });

  it("returns 403 for a coach (missing school:view_all_reports)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("coach")));

    const res = await GET(makeNextRequest("http://localhost/api/admin/waivers"));
    expect(res.status).toBe(403);
  });

  it("passes auth gate for school_admin (has school:view_all_reports)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("school_admin")));
    // getDb is called for user enrichment — return empty users list
    mockGetDb.mockResolvedValue({
      collection: jest.fn(() => ({
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      })),
    });

    const res = await GET(makeNextRequest("http://localhost/api/admin/waivers"));
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/matches/[matchId]/score — requires score:resolve_dispute
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/matches/[matchId]/score", () => {
  let PATCH: (req: NextRequest, ctx: { params: { matchId: string } }) => Promise<Response>;

  beforeAll(async () => {
    ({ PATCH } = await import("@/app/api/admin/matches/[matchId]/score/route"));
  });

  const ctx = { params: { matchId: MATCH_ID } };
  const validBody = { decision: "approve", dispute_notes: "Looks correct." };

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/matches/score", "PATCH", validBody),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a participant", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("participant")));

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/matches/score", "PATCH", validBody),
      ctx
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a captain (no score:resolve_dispute)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("captain")));

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/matches/score", "PATCH", validBody),
      ctx
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a referee (no score:resolve_dispute, only score:submit_official)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("referee")));

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/matches/score", "PATCH", validBody),
      ctx
    );
    expect(res.status).toBe(403);
  });

  it("passes auth gate for league_admin (has score:resolve_dispute)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const scopedDb = makeScopedDb(makeAssignments("league_admin"), {
      score_submissions: {
        find: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([{ _id: "sub1", match_id: MATCH_ID, status: "pending" }]),
        }),
        updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      },
      matches: {
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      },
      audit_logs: {
        insertOne: jest.fn().mockResolvedValue({ insertedId: "log1" }),
      },
    });
    mockGetScopedDb.mockResolvedValue(scopedDb);

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/matches/score", "PATCH", validBody),
      ctx
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/teams/[teamId] — requires team:approve
// This route uses getSessionWithRoles() which embeds assignments in the session.
// ---------------------------------------------------------------------------

describe("PATCH /api/admin/teams/[teamId]", () => {
  let PATCH: (req: NextRequest, ctx: { params: { teamId: string } }) => Promise<Response>;

  beforeAll(async () => {
    ({ PATCH } = await import("@/app/api/admin/teams/[teamId]/route"));
  });

  const ctx = { params: { teamId: TEAM_ID } };
  const validBody = { action: "approve", reason: "Looks good" };

  function makeSessionWithRoles(role: string) {
    return {
      userId: USER_ID,
      schoolId: SCHOOL_ID,
      schoolIds: [SCHOOL_ID],
      roles: [role],
      sportIds: [],
      leagueIds: [],
      teamIds: [],
      assignments: makeAssignments(role),
    };
  }

  it("returns 401 with no session", async () => {
    mockGetSessionWithRoles.mockResolvedValue(null);

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/teams/id", "PATCH", validBody),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a participant (no team:approve)", async () => {
    mockGetSessionWithRoles.mockResolvedValue(makeSessionWithRoles("participant"));

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/teams/id", "PATCH", validBody),
      ctx
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a captain (no team:approve, only team:manage_roster)", async () => {
    mockGetSessionWithRoles.mockResolvedValue(makeSessionWithRoles("captain"));

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/teams/id", "PATCH", validBody),
      ctx
    );
    expect(res.status).toBe(403);
  });

  it("passes auth gate for league_admin (has team:approve)", async () => {
    mockGetSessionWithRoles.mockResolvedValue(makeSessionWithRoles("league_admin"));
    mockGetScopedDb.mockResolvedValue(makeScopedDb([], {
      teams: {
        findOne: jest.fn().mockResolvedValue({ _id: TEAM_ID, status: "pending" }),
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      },
      audit_logs: {
        insertOne: jest.fn().mockResolvedValue({ insertedId: "log1" }),
      },
    }));

    const res = await PATCH(
      makeNextRequest("http://localhost/api/admin/teams/id", "PATCH", validBody),
      ctx
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/matches/[matchId]/incidents — requires incident:report
// ---------------------------------------------------------------------------

describe("POST /api/matches/[matchId]/incidents", () => {
  let POST: (req: NextRequest, ctx: { params: { matchId: string } }) => Promise<Response>;

  beforeAll(async () => {
    ({ POST } = await import("@/app/api/matches/[matchId]/incidents/route"));
  });

  const ctx = { params: { matchId: MATCH_ID } };
  const validBody = {
    severity: "medium",
    description: "Player altercation near the goal line during the second half.",
  };

  it("returns 401 with no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await POST(
      makeNextRequest("http://localhost/api/matches/id/incidents", "POST", validBody),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for a participant (no incident:report)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("participant")));

    const res = await POST(
      makeNextRequest("http://localhost/api/matches/id/incidents", "POST", validBody),
      ctx
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 for a captain (no incident:report)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    mockGetScopedDb.mockResolvedValue(makeScopedDb(makeAssignments("captain")));

    const res = await POST(
      makeNextRequest("http://localhost/api/matches/id/incidents", "POST", validBody),
      ctx
    );
    expect(res.status).toBe(403);
  });

  it("passes auth gate for referee (has incident:report)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const scopedDb = makeScopedDb(makeAssignments("referee"), {
      matches: {
        findOne: jest.fn().mockResolvedValue({ _id: MATCH_ID, school_id: SCHOOL_ID }),
      },
      incident_reports: {
        insertOne: jest.fn().mockResolvedValue({ insertedId: "eeeeeeeeeeeeeeeeeeeeeeee" }),
      },
      audit_logs: {
        insertOne: jest.fn().mockResolvedValue({ insertedId: "ffffffffffffffffffffffff" }),
      },
    });
    mockGetScopedDb.mockResolvedValue(scopedDb);

    const res = await POST(
      makeNextRequest("http://localhost/api/matches/id/incidents", "POST", validBody),
      ctx
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it("passes auth gate for league_admin (has league:manage which covers incident management)", async () => {
    mockGetSession.mockResolvedValue(makeSession());
    const scopedDb = makeScopedDb(makeAssignments("league_admin"), {
      matches: {
        findOne: jest.fn().mockResolvedValue({ _id: MATCH_ID, school_id: SCHOOL_ID }),
      },
      incident_reports: {
        insertOne: jest.fn().mockResolvedValue({ insertedId: "eeeeeeeeeeeeeeeeeeeeeeee" }),
      },
      audit_logs: {
        insertOne: jest.fn().mockResolvedValue({ insertedId: "ffffffffffffffffffffffff" }),
      },
    });
    mockGetScopedDb.mockResolvedValue(scopedDb);

    const res = await POST(
      makeNextRequest("http://localhost/api/matches/id/incidents", "POST", validBody),
      ctx
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
