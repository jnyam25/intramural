"use client";

import type { TeamStanding } from "@/lib/standings/calculator";

interface StandingRow extends TeamStanding {
  rank: number;
}

export function PlayoffQualificationCard({ standings }: { standings: StandingRow[] }) {
  if (standings.length === 0) return null;

  const showDanger = standings.length > 6;
  const top3 = standings.slice(0, 3);
  const bottom3 = showDanger ? standings.slice(-3) : [];
  const middle = showDanger ? standings.slice(3, standings.length - 3) : standings.slice(3);

  const Row = ({
    row,
    zone,
  }: {
    row: StandingRow;
    zone: "playoff" | "neutral" | "danger";
  }) => (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
        zone === "playoff"
          ? "bg-volt/10"
          : zone === "danger"
          ? "bg-hyper/10"
          : ""
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`font-mono text-xs w-5 text-center ${
            zone === "playoff"
              ? "text-volt"
              : zone === "danger"
              ? "text-hyper"
              : "text-gray-500"
          }`}
        >
          {row.rank}
        </span>
        <span className="text-sm font-medium text-gray-200 truncate max-w-[110px]">
          {row.team_name}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
        <span>
          {row.wins}-{row.losses}
        </span>
        <span
          className={`font-bold tabular-nums ${
            zone === "playoff"
              ? "text-volt"
              : zone === "danger"
              ? "text-hyper"
              : "text-white"
          }`}
        >
          {row.points}
        </span>
      </div>
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="font-display font-semibold text-white text-sm">Qualification</h3>
      </div>
      <div className="p-3 space-y-0.5">
        {top3.length > 0 && (
          <>
            <p className="text-xs text-volt font-medium px-1 pb-1">Playoff Zone</p>
            {top3.map((r) => (
              <Row key={r.team_id} row={r} zone="playoff" />
            ))}
          </>
        )}
        {middle.length > 0 && (
          <div className="py-0.5">
            {middle.map((r) => (
              <Row key={r.team_id} row={r} zone="neutral" />
            ))}
          </div>
        )}
        {bottom3.length > 0 && (
          <>
            <div className="border-t border-gray-800 my-1.5" />
            <p className="text-xs text-hyper font-medium px-1 pb-1">Danger Zone</p>
            {bottom3.map((r) => (
              <Row key={r.team_id} row={r} zone="danger" />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
