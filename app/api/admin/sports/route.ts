import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getDb } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  const db = await getDb();
  // Return school-specific sports plus global system sports (school_id null/absent)
  const sports = await db
    .collection("sports")
    .find({
      $or: [{ school_id: schoolId }, { school_id: null }, { school_id: { $exists: false } }],
      is_active: true,
    })
    .sort({ name: 1 })
    .toArray();

  return NextResponse.json(sports.map((s) => ({ id: s._id.toString(), name: s.name, slug: s.slug })));
}
