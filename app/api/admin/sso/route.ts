import { NextRequest, NextResponse } from "next/server";
import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { z } from "zod";

const SSOConfigRequestSchema = z.object({
  provider: z.enum(["google", "azure_ad", "okta"]),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
  tenant_id: z.string().optional(),
  domain: z.string().min(1),
  is_enabled: z.boolean().default(true),
});

async function requireSettingsAdmin() {
  const session = await getSessionWithRoles();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasPermission(session.assignments, "school:manage_settings")) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  return { session };
}

export async function PUT(req: NextRequest) {
  const auth = await requireSettingsAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = SSOConfigRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("schools").updateOne(
    { _id: new ObjectId(auth.session.schoolId) },
    {
      $set: {
        sso_config: parsed.data,
        domain: parsed.data.domain.toLowerCase(),
        updated_at: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "SSO configuration saved" });
}
