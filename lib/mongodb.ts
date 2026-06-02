import { MongoClient } from "mongodb";
import { autoEncryptionOptions } from "./mongodb/encrypted-schema";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("The MONGODB_URI environment variable is not set.");
}
// TypeScript narrowing doesn't cross module boundaries; assert non-null here.
const mongoUri: string = uri;

let encryptedClient: MongoClient | null = null;
let encryptedClientPromise: Promise<MongoClient> | null = null;
let unencryptedClient: MongoClient | null = null;
let unencryptedClientPromise: Promise<MongoClient> | null = null;

export async function getDb() {
  if (!encryptedClientPromise) {
    encryptedClient = new MongoClient(mongoUri, {
      ...(autoEncryptionOptions ? { autoEncryption: autoEncryptionOptions } : {}),
      retryWrites: true,
    });
    encryptedClientPromise = encryptedClient.connect();
  }

  const client = await encryptedClientPromise;
  return client.db("intramural");
}

export async function getUnencryptedDb() {
  if (!unencryptedClientPromise) {
    unencryptedClient = new MongoClient(mongoUri, {
      retryWrites: true,
    });
    unencryptedClientPromise = unencryptedClient.connect();
  }

  const client = await unencryptedClientPromise;
  return client.db("intramural");
}

// Eagerly-initialized unencrypted client for NextAuth adapter and scripts.
// The adapter does not handle PII fields, so no FLE needed here.
const _adapterClient = new MongoClient(mongoUri, { retryWrites: true });
export const clientPromise: Promise<MongoClient> = _adapterClient.connect();
