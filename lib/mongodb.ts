import { MongoClient } from "mongodb";
import { autoEncryptionOptions } from "./mongodb/encrypted-schema";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("The MONGODB_URI environment variable is not set.");
}
const mongoUri: string = uri;

let encryptedClientPromise: Promise<MongoClient> | null = null;
let unencryptedClientPromise: Promise<MongoClient> | null = null;

function makeUnencryptedClient() {
  if (!unencryptedClientPromise) {
    unencryptedClientPromise = new MongoClient(mongoUri, { retryWrites: true }).connect();
  }
  return unencryptedClientPromise;
}

export async function getDb() {
  // Only attempt FLE when the options are configured AND the native module exists.
  if (autoEncryptionOptions && !encryptedClientPromise) {
    try {
      const client = new MongoClient(mongoUri, {
        autoEncryption: autoEncryptionOptions,
        retryWrites: true,
      });
      encryptedClientPromise = client.connect();
    } catch {
      // mongodb-client-encryption not available in this environment (e.g. Vercel serverless,
      // or env vars still contain placeholder values). Fall through to plain connection.
      encryptedClientPromise = null;
    }
  }

  const client = await (encryptedClientPromise ?? makeUnencryptedClient());
  return client.db("intramural");
}

export async function getUnencryptedDb() {
  const client = await makeUnencryptedClient();
  return client.db("intramural");
}

// Eagerly-initialized plain client for NextAuth adapter (no FLE needed).
const _adapterClient = new MongoClient(mongoUri, { retryWrites: true });
export const clientPromise: Promise<MongoClient> = _adapterClient.connect();
