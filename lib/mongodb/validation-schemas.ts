// MongoDB document validation schemas for collections with required encrypted PII fields.
// Use these with `createCollection` or `collMod` in Atlas.

export const usersValidationSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["email", "first_name", "last_name", "sso_provider", "sso_id", "role", "is_minor", "created_at", "updated_at"],
    properties: {
      email: { bsonType: "binData", description: "Encrypted email is required." },
      first_name: { bsonType: "binData", description: "Encrypted first name is required." },
      last_name: { bsonType: "binData", description: "Encrypted last name is required." },
      parent_email: { bsonType: ["binData", "null"], description: "Encrypted parent email is required for minors." },
    },
  },
};

export const waiverSignaturesValidationSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["user_id", "waiver_template_id", "league_id", "signed_at", "ip_address", "user_agent", "is_parent_signature", "signer_user_id", "signature_hash"],
    properties: {
      ip_address: { bsonType: "binData", description: "Encrypted IP address is required." },
    },
  },
};

export const teamInvitesValidationSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["team_id", "league_id", "token", "created_by_user_id", "expires_at", "max_uses", "use_count", "is_revoked", "created_at"],
    properties: {
      token: { bsonType: "string", description: "Invite token is required." },
    },
  },
};
