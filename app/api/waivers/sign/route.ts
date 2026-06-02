import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { getScopedDb } from "@/lib/db/scoped";
import { getSchoolId } from "@/lib/db/school-context";
import { z } from "zod";
import {
  SignWaiverApiRequestSchema,
  WaiverSignatureDbSchema,
  AuditLogDbSchema,
} from "@/lib/validations/waiver";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const schoolId = getSchoolId(session);
    if (!schoolId) {
      return NextResponse.json({ error: "No school context" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const parseResult = SignWaiverApiRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const { waiverTemplateId, leagueId } = parseResult.data;

    const db = await getScopedDb(schoolId);

    const waiverTemplate = await db.collection("waiver_templates").findOne({
      _id: new ObjectId(waiverTemplateId),
      is_active: true,
    });
    if (!waiverTemplate) {
      return NextResponse.json({ error: "Active waiver template not found" }, { status: 404 });
    }

    const existingSignature = await db.collection("waiver_signatures").findOne({
      user_id: userId,
      waiver_template_id: waiverTemplateId,
      league_id: leagueId,
    });
    if (existingSignature) {
      return NextResponse.json(
        { message: "Waiver already signed for this version and league", data: existingSignature },
        { status: 200 }
      );
    }

    const timestamp = new Date();
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // Hash binds the exact waiver text, user, and timestamp — prevents retroactive edits.
    const hashPayload = `${waiverTemplate.body_html}${userId}${timestamp.toISOString()}`;
    const signatureHash = createHash("sha256").update(hashPayload).digest("hex");

    const signatureDoc = WaiverSignatureDbSchema.parse({
      school_id: schoolId,
      user_id: userId,
      waiver_template_id: waiverTemplateId,
      league_id: leagueId,
      signed_at: timestamp,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_parent_signature: false,
      signer_user_id: userId,
      signature_hash: signatureHash,
    });

    const insertResult = await db.collection("waiver_signatures").insertOne(signatureDoc);
    const insertedId = insertResult.insertedId.toString();

    const auditDoc = AuditLogDbSchema.parse({
      school_id: schoolId,
      timestamp,
      actor_user_id: userId,
      action: "WAIVER_SIGNED",
      entity_type: "waiver_signature",
      entity_id: insertedId,
      metadata: { leagueId, waiverVersion: waiverTemplate.version, ip: ipAddress },
    });
    await db.collection("audit_logs").insertOne(auditDoc);

    return NextResponse.json(
      { message: "Waiver signed successfully", signatureId: insertedId },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Data validation failed", details: error.errors },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
