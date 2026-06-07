import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getScopedDb } from "@/lib/db/scoped";
import { getSchoolId } from "@/lib/db/school-context";
import { getSession } from "@/lib/auth";
import { SubmitScoreRequestSchema, ScoreSubmissionDbSchema } from "@/lib/validations/match";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const schoolId = getSchoolId(session);
  if (!schoolId) {
    return NextResponse.json({ error: "No school context" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SubmitScoreRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid score data" }, { status: 400 });
  }

  const { matchId, homeTeamScore, awayTeamScore } = parsed.data;
  const db = await getScopedDb(schoolId);

  const match = await db.collection("matches").findOne({ _id: new ObjectId(matchId) });
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const isHomeCaptain = match.home_team_captain_id === session.user.id;
  const isAwayCaptain = match.away_team_captain_id === session.user.id;
  if (!isHomeCaptain && !isAwayCaptain) {
    return NextResponse.json({ error: "Only team captains can submit scores" }, { status: 403 });
  }

  const submittingTeam = isHomeCaptain ? "home" : "away";
  const timestamp = new Date();
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

  const existingSubmission = await db.collection("score_submissions").findOne({
    match_id: matchId,
    status: "pending",
  });

  let matchStatus: "pending_score_approval" | "completed" = "pending_score_approval";

  if (
    existingSubmission &&
    existingSubmission.submitted_by_team_role !== submittingTeam &&
    existingSubmission.home_team_score === homeTeamScore &&
    existingSubmission.away_team_score === awayTeamScore
  ) {
    matchStatus = "completed";
    await db.collection("score_submissions").updateOne(
      { _id: existingSubmission._id },
      { $set: { status: "approved", approved_at: timestamp } }
    );
  }

  const submissionDoc = ScoreSubmissionDbSchema.parse({
    school_id: schoolId,
    match_id: matchId,
    submitted_by_user_id: session.user.id,
    submitted_by_team_role: submittingTeam,
    home_team_score: homeTeamScore,
    away_team_score: awayTeamScore,
    submitted_at: timestamp,
    ip_address: ipAddress,
    status: matchStatus === "completed" ? "approved" : "pending",
  });

  const inserted = await db.collection("score_submissions").insertOne(submissionDoc);

  await db.collection("matches").updateOne(
    { _id: match._id },
    {
      $set: {
        status: matchStatus,
        ...(matchStatus === "completed" && {
          home_team_score: homeTeamScore,
          away_team_score: awayTeamScore,
        }),
      },
    }
  );

  await db.collection("audit_logs").insertOne({
    school_id: schoolId,
    timestamp,
    actor_user_id: session.user.id,
    action: "SCORE_SUBMITTED",
    entity_type: "match",
    entity_id: matchId,
    metadata: {
      home_score: homeTeamScore,
      away_score: awayTeamScore,
      submitter_role: submittingTeam,
      auto_approved: matchStatus === "completed",
    },
  });

  return NextResponse.json(
    {
      message:
        matchStatus === "completed"
          ? "Score confirmed by both teams"
          : "Score submitted, awaiting opponent confirmation",
      status: matchStatus,
      submissionId: inserted.insertedId.toString(),
    },
    { status: 201 }
  );
}
