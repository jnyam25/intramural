/**
 * ScopedDb tenant isolation unit tests.
 * Tests the middleware layer directly — no HTTP stack, no next/server needed.
 * Constructs ScopedDb with a mock Db object to verify that school_id injection
 * works correctly and that cross-tenant reads/writes are blocked.
 */

// Prevent lib/mongodb from throwing at import time (MONGODB_URI not needed for unit tests)
jest.mock("@/lib/mongodb", () => ({ getDb: jest.fn() }));

import { ScopedDb, buildScopeFromRoles } from "@/lib/db/scoped-db";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCHOOL_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const SCHOOL_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCollection() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
    insertOne: jest.fn().mockResolvedValue({ insertedId: "newid000000000000000" }),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };
}

function makeMockDb() {
  const coll = makeMockCollection();
  return {
    mockColl: coll,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db: { collection: () => coll } as any,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScopedDb tenant isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("injects school_id into tenant-scoped collection queries", async () => {
    const { mockColl, db } = makeMockDb();
    const scopedDb = new ScopedDb(db, { schoolId: SCHOOL_A });
    await scopedDb.collection("matches").findOne({});
    expect(mockColl.findOne.mock.calls[0][0]).toMatchObject({ school_id: SCHOOL_A });
  });

  it("does not inject school_id for global collections (schools)", async () => {
    const { mockColl, db } = makeMockDb();
    const scopedDb = new ScopedDb(db, { schoolId: SCHOOL_A });
    await scopedDb.collection("schools").findOne({});
    expect(mockColl.findOne.mock.calls[0][0]).not.toHaveProperty("school_id");
  });

  it("participant query anchors school_id even when caller passes another school", async () => {
    const { mockColl, db } = makeMockDb();
    const session = { userId: "user1", schoolId: SCHOOL_A, roles: ["participant" as const] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scope = buildScopeFromRoles(session as any);
    const scopedDb = new ScopedDb(db, scope);
    await scopedDb.collection("matches").findOne({ school_id: SCHOOL_B });
    // injectScope wraps with $and, ensuring SCHOOL_A is always present in the filter
    const filterStr = JSON.stringify(mockColl.findOne.mock.calls[0][0]);
    expect(filterStr).toContain(SCHOOL_A);
  });

  it("cross-tenant insertOne throws", async () => {
    const { db } = makeMockDb();
    const scopedDb = new ScopedDb(db, { schoolId: SCHOOL_A });
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scopedDb.collection("matches").insertOne({ school_id: SCHOOL_B } as any)
    ).rejects.toThrow("Cross-tenant insert attempted");
  });

  it("bypassIsolation=true skips school_id injection (getPlatformDb equivalent)", async () => {
    const { mockColl, db } = makeMockDb();
    const platformDb = new ScopedDb(db, { schoolId: "" }, true);
    await platformDb.collection("matches").findOne({});
    expect(mockColl.findOne.mock.calls[0][0]).toEqual({});
  });

  it("incident_reports are tenant-scoped (Phase 2 protection)", async () => {
    const { mockColl, db } = makeMockDb();
    const scopedDb = new ScopedDb(db, { schoolId: SCHOOL_A });
    await scopedDb.collection("incident_reports").findOne({});
    expect(mockColl.findOne.mock.calls[0][0]).toMatchObject({ school_id: SCHOOL_A });
  });

  it("referee_assignments are tenant-scoped (Phase 2 protection)", async () => {
    const { mockColl, db } = makeMockDb();
    const scopedDb = new ScopedDb(db, { schoolId: SCHOOL_A });
    await scopedDb.collection("referee_assignments").findOne({});
    expect(mockColl.findOne.mock.calls[0][0]).toMatchObject({ school_id: SCHOOL_A });
  });

  it("soft-delete: deleteOne sets deleted_at instead of hard-removing", async () => {
    const { mockColl, db } = makeMockDb();
    const scopedDb = new ScopedDb(db, { schoolId: SCHOOL_A });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await scopedDb.collection("matches").deleteOne({ name: "to-delete" } as any);
    // updateOne is called (not deleteOne) with a $set: { deleted_at } update
    expect(mockColl.updateOne).toHaveBeenCalled();
    expect(mockColl.deleteOne).not.toHaveBeenCalled();
    const [filterArg, updateArg] = mockColl.updateOne.mock.calls[0];
    // The filter contains school_id somewhere (may be wrapped in $and)
    expect(JSON.stringify(filterArg)).toContain(SCHOOL_A);
    expect(updateArg).toMatchObject({ $set: { deleted_at: expect.any(Date) } });
  });

  it("bypassIsolation allows hard-delete (e.g. for retention scripts)", async () => {
    const { mockColl, db } = makeMockDb();
    const platformDb = new ScopedDb(db, { schoolId: "" }, true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await platformDb.collection("matches").deleteOne({ name: "to-delete" } as any);
    // With bypassIsolation, deleteOne should call the underlying deleteOne, not updateOne
    expect(mockColl.deleteOne).toHaveBeenCalled();
    expect(mockColl.updateOne).not.toHaveBeenCalled();
  });
});
