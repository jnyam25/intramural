import { getDb } from "@/lib/mongodb";

export interface SchoolSSOConfig {
  school_id: string;
  provider: "google" | "azure_ad" | "okta";
  client_id: string;
  client_secret?: string;
  tenant_id?: string;
  domain: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  is_enabled: boolean;
}

/**
 * Resolve school from email domain for multi-tenant SSO
 */
export async function resolveSchoolFromEmail(email: string): Promise<string | null> {
  const domain = email.split("@")[1];
  if (!domain) return null;

  const db = await getDb();
  const school = await db.collection("schools").findOne({
    $or: [{ domain: domain }, { "sso_config.domain": domain }],
    status: { $in: ["trial", "active"] },
  });

  return school?._id?.toString() || null;
}

/**
 * Get SSO configuration for a specific school
 */
export async function getSchoolSSOConfig(schoolId: string): Promise<SchoolSSOConfig | null> {
  const db = await getDb();
  const school = await db.collection("schools").findOne({
    _id: new (await import("mongodb")).ObjectId(schoolId),
  });

  if (!school?.sso_config?.is_enabled) {
    return null;
  }

  return {
    school_id: schoolId,
    ...school.sso_config,
  };
}

/**
 * Validate that the email domain matches the school's configured domain
 */
export function validateEmailDomain(email: string, allowedDomain: string): boolean {
  const domain = email.split("@")[1];
  if (!domain) return false;

  // Exact match
  if (domain === allowedDomain) return true;

  // Subdomain match (e.g., @cs.stanford.edu matches @stanford.edu)
  if (domain.endsWith("." + allowedDomain)) return true;

  return false;
}

/**
 * Get school by slug for URL-based routing
 */
export async function getSchoolBySlug(slug: string) {
  const db = await getDb();
  return db.collection("schools").findOne({
    slug: slug,
    status: { $in: ["trial", "active"] },
  });
}
