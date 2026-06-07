import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";

// GET /api/teams/[teamId]/messages - Get chat messages
export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  const db = await getScopedDb(schoolId);

  // Verify user is team member
  const team = await db.collection("teams").findOne({
    _id: new ObjectId(params.teamId),
    school_id: schoolId,
    "roster.user_id": session.user.id,
    "roster.status": "approved",
  });

  if (!team) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch messages
  const messages = await db
    .collection("messages")
    .find({ team_id: params.teamId, deleted_at: null })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray();

  // Fetch sender details
  const messagesWithSenders = await Promise.all(
    messages.map(async (msg: any) => {
      const sender = await db
        .collection("users")
        .findOne({ _id: new ObjectId(msg.sender_user_id) });
      return {
        id: msg._id.toString(),
        sender_user_id: msg.sender_user_id,
        content: msg.content,
        message_type: msg.message_type,
        created_at: msg.created_at,
        sender: sender
          ? {
              first_name: sender.first_name,
              last_name: sender.last_name,
            }
          : null,
      };
    })
  );

  return NextResponse.json({
    messages: messagesWithSenders.reverse(), // Chronological order
  });
}

// POST /api/teams/[teamId]/messages - Send message
export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 400 });
  }

  const db = await getScopedDb(schoolId);

  // Verify user is team member
  const team = await db.collection("teams").findOne({
    _id: new ObjectId(params.teamId),
    school_id: schoolId,
    "roster.user_id": session.user.id,
    "roster.status": "approved",
  });

  if (!team) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.content?.trim()) {
    return NextResponse.json({ error: "Message content required" }, { status: 400 });
  }

  const now = new Date();

  const messageDoc = {
    _id: new ObjectId(),
    team_id: params.teamId,
    sender_user_id: session.user.id,
    content: body.content.trim(),
    message_type: body.message_type || "text",
    created_at: now,
    edited_at: null,
    deleted_at: null,
  };

  await db.collection("messages").insertOne(messageDoc);

  // Return with sender info
  return NextResponse.json({
    message: {
      id: messageDoc._id.toString(),
      sender_user_id: messageDoc.sender_user_id,
      content: messageDoc.content,
      message_type: messageDoc.message_type,
      created_at: messageDoc.created_at,
      sender: {
        first_name: session.user.first_name || "",
        last_name: session.user.last_name || "",
      },
    },
  });
}
