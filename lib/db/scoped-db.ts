import {
  AggregateOptions,
  Collection,
  CountDocumentsOptions,
  Db,
  DeleteOptions,
  DeleteResult,
  Document,
  Filter,
  FindOptions,
  OptionalUnlessRequiredId,
  UpdateFilter,
  UpdateOptions,
  UpdateResult,
} from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { RoleAssignmentDbDocument } from "@/lib/validations/school";

export interface TenantScope {
  schoolId: string;
  sportIds?: string[];
  leagueIds?: string[];
  teamIds?: string[];
  userId?: string;
}

// Collections that receive automatic school_id injection.
// "schools" and "users" are intentionally excluded:
//   - schools: no school_id self-reference; injection would lock platform admins to one school
//   - users: field is school_ids[] (array), not school_id (singular)
const TENANT_COLLECTIONS = new Set([
  "sports",
  "leagues",
  "teams",
  "matches",
  "waiver_templates",
  "waiver_signatures",
  "score_submissions",
  "team_invites",
  "role_assignments",
  "audit_logs",
  "scoring_systems",
  "incident_reports",
  "referee_assignments",
  "standings",
]);

export interface SessionWithRoles {
  userId: string;
  schoolId: string;
  roles: RoleAssignmentDbDocument["role"][];
  sportIds?: string[];
  leagueIds?: string[];
  teamIds?: string[];
}

class ScopedCollection<T extends Document = Document> {
  constructor(
    private collection: Collection<T>,
    private scope: TenantScope,
    private isTenantScoped: boolean,
    private bypassIsolation = false
  ) {}

  private injectScope(filter: Filter<T> = {} as Filter<T>): Filter<T> {
    if (!this.isTenantScoped || this.bypassIsolation) return filter;

    const scopeFilter: Filter<T> = { school_id: this.scope.schoolId } as unknown as Filter<T>;

    if (this.scope.sportIds?.length) {
      Object.assign(scopeFilter, { sport_id: { $in: this.scope.sportIds } } as unknown as Filter<T>);
    }

    if (this.scope.leagueIds?.length) {
      Object.assign(scopeFilter, { league_id: { $in: this.scope.leagueIds } } as unknown as Filter<T>);
    }

    if (this.scope.teamIds?.length) {
      Object.assign(scopeFilter, {
        $or: [
          { home_team_id: { $in: this.scope.teamIds } },
          { away_team_id: { $in: this.scope.teamIds } },
          { team_id: { $in: this.scope.teamIds } },
        ],
      } as unknown as Filter<T>);
    }

    if (this.scope.userId) {
      const userScope: Filter<T> = {
        $or: [
          { user_id: this.scope.userId },
          { signer_user_id: this.scope.userId },
          { captain_user_id: this.scope.userId },
          { _id: this.scope.userId as unknown },
        ],
      } as Filter<T>;

      const mutable = scopeFilter as unknown as { $and?: Filter<T>[] };
      mutable.$and = mutable.$and ? [...mutable.$and, userScope] : [userScope];
    }

    if (Object.keys(filter).length === 0) {
      return scopeFilter;
    }

    return { $and: [scopeFilter, filter] } as Filter<T>;
  }

  async findOne(filter: Filter<T>, options?: FindOptions) {
    return this.collection.findOne(this.injectScope(filter), options);
  }

  find(filter: Filter<T>, options?: FindOptions) {
    return this.collection.find(this.injectScope(filter), options);
  }

  async insertOne(doc: Partial<T>, options?: Parameters<Collection["insertOne"]>[1]) {
    const withScope = { ...doc, school_id: this.scope.schoolId } as Document;
    if (
      (doc as Document).school_id &&
      (doc as Document).school_id !== this.scope.schoolId
    ) {
      throw new Error("Cross-tenant insert attempted");
    }
    return this.collection.insertOne(withScope as OptionalUnlessRequiredId<T>, options);
  }

  async updateOne(filter: Filter<T>, update: UpdateFilter<T>, options?: UpdateOptions) {
    return this.collection.updateOne(this.injectScope(filter), update, options);
  }

  async updateMany(filter: Filter<T>, update: UpdateFilter<T>, options?: UpdateOptions) {
    return this.collection.updateMany(this.injectScope(filter), update, options);
  }

  // Soft-delete for tenant-scoped collections: sets deleted_at instead of hard-removing.
  // Hard deletes are only performed when bypassIsolation=true (platform admin / retention scripts).
  async deleteOne(
    filter: Filter<T>,
    options?: DeleteOptions
  ): Promise<UpdateResult | DeleteResult> {
    if (this.isTenantScoped && !this.bypassIsolation) {
      return this.collection.updateOne(
        this.injectScope(filter),
        { $set: { deleted_at: new Date() } } as unknown as UpdateFilter<T>,
        options as UpdateOptions
      );
    }
    return this.collection.deleteOne(this.injectScope(filter), options);
  }

  async deleteMany(filter: Filter<T>, options?: DeleteOptions) {
    return this.collection.deleteMany(this.injectScope(filter), options);
  }

  async countDocuments(filter: Filter<T>, options?: CountDocumentsOptions) {
    return this.collection.countDocuments(this.injectScope(filter), options);
  }

  async aggregate(pipeline: Document[], options?: AggregateOptions) {
    if (!this.isTenantScoped || this.bypassIsolation) {
      return this.collection.aggregate(pipeline, options).toArray();
    }

    const scopeMatch = { $match: { school_id: this.scope.schoolId } };
    return this.collection.aggregate([scopeMatch, ...pipeline], options).toArray();
  }
}

export class ScopedDb {
  constructor(
    private db: Db,
    private scope: TenantScope,
    private bypassIsolation = false
  ) {}

  collection<T extends Document = Document>(name: string) {
    const isTenantScoped = TENANT_COLLECTIONS.has(name);
    return new ScopedCollection<T>(
      this.db.collection(name),
      this.scope,
      isTenantScoped,
      this.bypassIsolation
    );
  }
}

export async function getScopedDb(session: SessionWithRoles) {
  const db = await getDb();
  const scope = buildScopeFromRoles(session);
  return new ScopedDb(db, scope);
}

export async function getPlatformDb(session: SessionWithRoles) {
  if (!session.roles.includes("platform_admin")) {
    throw new Error("getPlatformDb requires platform_admin role");
  }
  const db = await getDb();
  return new ScopedDb(db, { schoolId: "" }, true);
}

export function buildScopeFromRoles(session: SessionWithRoles): TenantScope {
  const baseScope: TenantScope = {
    schoolId: session.schoolId,
    userId: session.userId,
  };

  if (session.roles.includes("school_admin")) {
    return { schoolId: session.schoolId };
  }

  if (session.roles.includes("sports_admin")) {
    return {
      schoolId: session.schoolId,
      sportIds: session.sportIds,
    };
  }

  if (session.roles.includes("league_admin")) {
    return {
      schoolId: session.schoolId,
      leagueIds: session.leagueIds,
    };
  }

  if (session.roles.includes("coach") || session.roles.includes("captain")) {
    return {
      schoolId: session.schoolId,
      teamIds: session.teamIds,
    };
  }

  if (session.roles.includes("referee")) {
    return {
      schoolId: session.schoolId,
    };
  }

  return baseScope;
}
