import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 401 });

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const db = await getScopedDb(schoolId);
  const globalDb = await getDb();

  const [signatures, totalCount] = await Promise.all([
    db.collection("waiver_signatures").find({}).toArray().then((sigs: any[]) =>
      sigs.slice(skip, skip + limit)
    ),
    db.collection("waiver_signatures").countDocuments({}),
  ]);

  // Enrich with user info
  const userIds = [...new Set(signatures.map((s: any) => s.user_id))];
  const users = userIds.length
    ? await globalDb
        .collection("users")
        .find({ _id: { $in: userIds } } as any)
        .toArray()
    : [];

  const userMap: Record<string, any> = {};
  for (const u of users) {
    userMap[(u as any)._id.toString()] = u;
  }

  const enriched = signatures.map((s: any) => {
    const user = userMap[s.user_id] ?? {};
    return {
      _id: s._id.toString(),
      user_name: user.first_name
        ? `${user.first_name} ${user.last_name}`
        : user.email ?? s.user_id,
      user_email: user.email ?? s.user_id,
      signed_at: s.signed_at,
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      is_parent_signature: s.is_parent_signature,
      signature_hash: s.signature_hash,
    };
  });

  return NextResponse.json({
    data: enriched,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}
