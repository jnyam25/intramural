import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";

const CreateWaiverTemplateSchema = z.object({
  title: z.string().min(1).max(200),
  body_html: z.string().min(10),
});

async function requireManageSettings() {
  const session = await getSessionWithRoles();
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasPermission(session.assignments, "school:manage_settings")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const auth = await requireManageSettings();
  if (auth.error) return auth.error;
  const { session } = auth;

  const db = await getScopedDb(session!.schoolId);

  const templates = await db
    .collection("waiver_templates")
    .find({})
    .sort({ version: -1 })
    .toArray();

  const withCounts = await Promise.all(
    templates.map(async (t: any) => {
      const signature_count = await db
        .collection("waiver_signatures")
        .countDocuments({ waiver_template_id: t._id.toString() });
      return { ...t, _id: t._id.toString(), signature_count };
    })
  );

  return NextResponse.json({ data: withCounts });
}

export async function POST(req: NextRequest) {
  const auth = await requireManageSettings();
  if (auth.error) return auth.error;
  const { session } = auth;

  const body = await req.json().catch(() => null);
  const parsed = CreateWaiverTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const db = await getScopedDb(session!.schoolId);

  const latest = await db
    .collection("waiver_templates")
    .find({})
    .sort({ version: -1 })
    .limit(1)
    .toArray();
  const nextVersion = ((latest[0] as any)?.version ?? 0) + 1;

  await db.collection("waiver_templates").updateMany({}, { $set: { is_active: false } });

  const templateId = new ObjectId();
  const now = new Date();
  await db.collection("waiver_templates").insertOne({
    _id: templateId,
    title: parsed.data.title,
    body_html: parsed.data.body_html,
    version: nextVersion,
    is_active: true,
    created_at: now,
  });

  await db.collection("audit_logs").insertOne({
    school_id: session!.schoolId,
    timestamp: now,
    actor_user_id: session!.userId,
    action: "WAIVER_TEMPLATE_CREATED",
    entity_type: "waiver_template",
    entity_id: templateId.toString(),
    metadata: { version: nextVersion, title: parsed.data.title },
  });

  return NextResponse.json({ templateId: templateId.toString(), version: nextVersion }, { status: 201 });
}
