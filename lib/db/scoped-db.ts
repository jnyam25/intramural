import { Collection, Db, Document, Filter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { RoleAssignmentDbDocument } from "@/lib/validations/school";

export interface TenantScope {
  schoolId: string;
  sportIds?: string[];
  leagueIds?: string[];
  teamIds?: string[];
  userId?: string;
}

const TENANT_COLLECTIONS = new Set([
  "users",
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
    private isTenantScoped: boolean
  ) {}

  private injectScope(filter: Filter<T> = {} as Filter<T>): Filter<T> {
    if (!this.isTenantScoped) return filter;

    const scopeFilter: Filter<T> = { school_id: this.scope.schoolId } as unknown as Filter<T>;

    if (this.scope.sportIds?.length) {
      Object.assign(scopeFilter, { sport_id: { $in: this.scope.sportIds } } as unknown as Filter<T>);
    }

    if (this.scope.leagueIds?.length) {
      Object.assign(scopeFilter, { league_id: { $in: this.scope.leagueIds } } as unknown as Filter<T>);
    }

    if (this.scope.teamIds?.length) {
      (scopeFilter as any).$or = [
        { home_team_id: { $in: this.scope.teamIds } },
        { away_team_id: { $in: this.scope.teamIds } },
        { team_id: { $in: this.scope.teamIds } },
      ];
    }

    if (this.scope.userId) {
      const userScope: Filter<T> = {
        $or: [
          { user_id: this.scope.userId },
          { signer_user_id: this.scope.userId },
          { captain_user_id: this.scope.userId },
          { _id: this.scope.userId as any },
        ],
      } as Filter<T>;

      scopeFilter.$and = scopeFilter.$and ? [...(scopeFilter.$and as any[]), userScope] : [userScope];
    }

    if (Object.keys(filter).length === 0) {
      return scopeFilter;
    }

    return { $and: [scopeFilter, filter] } as Filter<T>;
  }

  async findOne(filter: Filter<T>, options?: any) {
    return this.collection.findOne(this.injectScope(filter), options);
  }

  find(filter: Filter<T>, options?: any) {
    return this.collection.find(this.injectScope(filter), options);
  }

  async insertOne(doc: Partial<T>, options?: any) {
    const document = { ...doc } as any;
    if (document.school_id && document.school_id !== this.scope.schoolId) {
      throw new Error("Cross-tenant insert attempted");
    }
    document.school_id = this.scope.schoolId;
    return this.collection.insertOne(document, options);
  }

  async updateOne(filter: Filter<T>, update: any, options?: any) {
    return this.collection.updateOne(this.injectScope(filter), update, options);
  }

  async updateMany(filter: Filter<T>, update: any, options?: any) {
    return this.collection.updateMany(this.injectScope(filter), update, options);
  }

  async deleteOne(filter: Filter<T>, options?: any) {
    return this.collection.deleteOne(this.injectScope(filter), options);
  }

  async deleteMany(filter: Filter<T>, options?: any) {
    return this.collection.deleteMany(this.injectScope(filter), options);
  }
}

export class ScopedDb {
  constructor(private db: Db, private scope: TenantScope) {}

  collection<T extends Document = Document>(name: string) {
    const isTenantScoped = TENANT_COLLECTIONS.has(name);
    return new ScopedCollection<T>(this.db.collection(name), this.scope, isTenantScoped);
  }
}

export async function getScopedDb(session: SessionWithRoles) {
  const db = await getDb();
  const scope = buildScopeFromRoles(session);
  return new ScopedDb(db, scope);
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
