import {
  Collection,
  DeleteOptions,
  Document,
  Filter,
  FindOptions,
  UpdateFilter,
  UpdateOptions,
} from "mongodb";
import { getDb } from "@/lib/mongodb";

// Collections that have no school_id (global/shared data). Accessing these
// through getScopedDb still works — school_id is just not injected.
const GLOBAL_COLLECTIONS = new Set(["sports", "scoring_systems"]);

class ScopedCollection {
  constructor(
    private col: Collection,
    private schoolId: string,
    private isGlobal: boolean
  ) {}

  private scope(filter: Filter<Document>): Filter<Document> {
    if (this.isGlobal) return filter;
    return { ...filter, school_id: this.schoolId };
  }

  findOne(filter: Filter<Document>, options?: FindOptions) {
    return this.col.findOne(this.scope(filter), options);
  }

  find(filter: Filter<Document>, options?: FindOptions) {
    return this.col.find(this.scope(filter), options);
  }

  insertOne(doc: Document) {
    const withTenant = this.isGlobal ? doc : { ...doc, school_id: this.schoolId };
    return this.col.insertOne(withTenant);
  }

  updateOne(
    filter: Filter<Document>,
    update: UpdateFilter<Document> | Document,
    options?: UpdateOptions
  ) {
    return this.col.updateOne(this.scope(filter), update as UpdateFilter<Document>, options);
  }

  updateMany(
    filter: Filter<Document>,
    update: UpdateFilter<Document> | Document,
    options?: UpdateOptions
  ) {
    return this.col.updateMany(this.scope(filter), update as UpdateFilter<Document>, options);
  }

  async findOneAndUpdate(
    filter: Filter<Document>,
    update: UpdateFilter<Document>,
    options?: Record<string, unknown>
  ): Promise<Document | null> {
    // Cast through unknown to avoid overload resolution picking ModifyResult variant.
    // MongoDB 6+ returns the document directly (WithId<T> | null), not { value }.
    return this.col.findOneAndUpdate(
      this.scope(filter),
      update,
      options as any
    ) as unknown as Promise<Document | null>;
  }

  deleteOne(filter: Filter<Document>, options?: DeleteOptions) {
    return this.col.deleteOne(this.scope(filter), options);
  }

  countDocuments(filter: Filter<Document> = {}) {
    return this.col.countDocuments(this.scope(filter));
  }
}

export async function getScopedDb(schoolId: string) {
  const db = await getDb();
  return {
    collection(name: string): ScopedCollection {
      return new ScopedCollection(db.collection(name), schoolId, GLOBAL_COLLECTIONS.has(name));
    },
  };
}
