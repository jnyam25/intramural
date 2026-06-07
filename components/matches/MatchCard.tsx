"use client";

import Link from "next/link";

interface MatchCardProps {
  matchId: string;
  leagueId: string;
  leagueName?: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: string;
  location?: string;
  status: "scheduled" | "in_progress" | "completed" | "pending_score_approval" | "disputed";
  viewerRole: "captain" | "referee" | "participant" | "coach";
  myTeamSide?: "home" | "away";
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: "badge-info",
  in_progress: "badge-success",
  completed: "badge-neutral",
  pending_score_approval: "badge-warning",
  disputed: "bg-hyper/10 text-hyper border border-hyper/20 px-2 py-0.5 rounded-full text-xs font-medium",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "Live",
  completed: "Completed",
  pending_score_approval: "Awaiting Approval",
  disputed: "Disputed",
};

export function MatchCard({
  matchId,
  leagueId,
  leagueName,
  homeTeamName,
  awayTeamName,
  scheduledAt,
  location,
  status,
  viewerRole,
  myTeamSide,
}: MatchCardProps) {
  const date = new Date(scheduledAt);
  const detailHref = `/leagues/${leagueId}/matches/${matchId}`;
  const checkinHref = `/assignments/${matchId}/checkin`;

  const cta =
    viewerRole === "captain" && status === "scheduled" ? (
      <Link href={detailHref} className="btn-primary text-sm py-1.5 px-3 whitespace-nowrap">
        Submit Score
      </Link>
    ) : viewerRole === "referee" ? (
      <Link href={checkinHref} className="btn-secondary text-sm py-1.5 px-3 whitespace-nowrap">
        Check-in
      </Link>
    ) : (
      <Link href={detailHref} className="btn-ghost text-sm py-1.5 px-3 whitespace-nowrap">
        View Details
      </Link>
    );

  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-semibold text-white text-sm truncate">
            {homeTeamName} <span className="text-gray-500 font-normal">vs</span> {awayTeamName}
          </span>
          {myTeamSide && (
            <span className="text-xs text-gray-500">({myTeamSide === "home" ? "Home" : "Away"})</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
          <span>
            {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            {" · "}
            {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
          {location && <span>📍 {location}</span>}
          {leagueName && <span className="text-gray-600">{leagueName}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={STATUS_BADGE[status] ?? "badge-neutral"}>{STATUS_LABEL[status] ?? status}</span>
        {cta}
      </div>
    </div>
  );
}
