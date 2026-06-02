import { AutoEncryptionOptions } from "mongodb";

export const encryptedFieldsMap = process.env.MONGO_DEK_ID
  ? {
      "intramural.users": {
        fields: [
          {
            keyId: Buffer.from(process.env.MONGO_DEK_ID, "hex"),
            path: "email",
            bsonType: "string",
            queries: { queryType: "equality" },
          },
          {
            keyId: Buffer.from(process.env.MONGO_DEK_ID, "hex"),
            path: "first_name",
            bsonType: "string",
            queries: { queryType: "equality" },
          },
          {
            keyId: Buffer.from(process.env.MONGO_DEK_ID, "hex"),
            path: "last_name",
            bsonType: "string",
            queries: { queryType: "equality" },
          },
          {
            keyId: Buffer.from(process.env.MONGO_DEK_ID, "hex"),
            path: "parent_email",
            bsonType: "string",
            queries: { queryType: "equality" },
          },
        ],
      },
      "intramural.waiver_signatures": {
        fields: [
          {
            keyId: Buffer.from(process.env.MONGO_DEK_ID, "hex"),
            path: "ip_address",
            bsonType: "string",
          },
        ],
      },
    }
  : null;

export const autoEncryptionOptions: AutoEncryptionOptions | null =
  process.env.MONGO_DEK_ID && process.env.MONGO_LOCAL_MASTER_KEY
    ? {
        keyVaultNamespace: "intramural.__keyVault",
        kmsProviders: {
          local: {
            key: Buffer.from(process.env.MONGO_LOCAL_MASTER_KEY, "base64"),
          },
        },
        encryptedFieldsMap: encryptedFieldsMap!,
        bypassQueryAnalysis: false,
      }
    : null;
