import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { getDb } from "@/lib/mongodb";
import { hasPermission, parseRoleAssignments } from "@/lib/auth/permissions";
import { z } from "zod";
import { ObjectId } from "mongodb";

// Validation schema for query parameters
const QueryParamsSchema = z.object({
  leagueId: z.string().length(24).optional(),
  userId: z.string().length(24).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export async function GET(req: NextRequest) {
  // Auth and permission check run outside try/catch so errors propagate cleanly.
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 401 });

  const db0 = await getScopedDb(schoolId);
  const assignments = parseRoleAssignments(
    await db0
      .collection("role_assignments")
      .find({ user_id: session.user.id, school_id: schoolId, revoked_at: null })
      .toArray()
  );
  if (!hasPermission(assignments, "school:view_all_reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 2. PARSE & VALIDATE QUERY PARAMETERS
    const { searchParams } = new URL(req.url);
    const parseResult = QueryParamsSchema.safeParse({
      leagueId: searchParams.get("leagueId"),
      userId: searchParams.get("userId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { leagueId, userId, page, limit } = parseResult.data;
    const db = db0;
    const globalDb = await getDb();

    // 3. BUILD FILTER
    const filter: Record<string, any> = {};
    if (leagueId) filter.league_id = leagueId;
    if (userId) filter.user_id = userId;

    // 4. PAGINATION CALCULATION
    const skip = (page - 1) * limit;

    // 5. EXECUTE QUERIES
    const [signatures, totalCount] = await Promise.all([
      db.collection("waiver_signatures")
        .find(filter)
        .sort({ signed_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("waiver_signatures").countDocuments(filter),
    ]);

    // 6. ENRICH WITH USER DATA
    const userIds = [...new Set(signatures.map((s: any) => s.user_id))];
    const users = userIds.length
      ? await globalDb
          .collection("users")
          .find({ _id: { $in: userIds.map((id: string) => new ObjectId(id)) } })
          .toArray()
      : [];

    const userMap: Record<string, any> = {};
    for (const u of users) {
      userMap[u._id.toString()] = u;
    }

    const enriched = signatures.map((s: any) => {
      const user = userMap[s.user_id] ?? {};
      return {
        _id: s._id.toString(),
        user_id: s.user_id,
        user_name: user.first_name
          ? `${user.first_name} ${user.last_name}`
          : user.email ?? s.user_id,
        user_email: user.email ?? s.user_id,
        signed_at: s.signed_at,
        ip_address: s.ip_address,
        user_agent: s.user_agent,
        is_parent_signature: s.is_parent_signature,
        signature_hash: s.signature_hash,
        waiver_template_id: s.waiver_template_id,
        league_id: s.league_id,
      };
    });

    // 7. RETURN PAGINATED RESPONSE
    return NextResponse.json({
      data: enriched,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error("Admin Waivers Query Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
