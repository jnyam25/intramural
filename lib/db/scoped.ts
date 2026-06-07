import {
  BulkWriteOptions,
  Collection,
  DeleteOptions,
  Document,
  Filter,
  FindOneAndUpdateOptions,
  FindOptions,
  UpdateFilter,
  UpdateOptions,
} from "mongodb";
import { getDb } from "@/lib/mongodb";

// Collections that have no school_id (global/shared data). Accessing these
// through getScopedDb still works — school_id is just not injected.
// "schools": no school_id self-reference field; platform admin lockout if scoped.
// "users": field is school_ids[] (array plural), not school_id singular.
const GLOBAL_COLLECTIONS = new Set(["sports", "scoring_systems", "schools", "users"]);

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

  insertMany(docs: Document[], options?: BulkWriteOptions) {
    const withTenant = this.isGlobal
      ? docs
      : docs.map((doc) => ({ ...doc, school_id: this.schoolId }));
    return this.col.insertMany(withTenant, options);
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
    options?: FindOneAndUpdateOptions
  ): Promise<Document | null> {
    // MongoDB 6+ returns WithId<T> | null directly; cast to match declared return type.
    // Split the call to help TypeScript resolve the correct overload.
    const result = options
      ? this.col.findOneAndUpdate(this.scope(filter), update, options)
      : this.col.findOneAndUpdate(this.scope(filter), update);
    return result as unknown as Promise<Document | null>;
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
