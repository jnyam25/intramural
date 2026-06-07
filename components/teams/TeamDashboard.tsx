"use client";

import { useState } from "react";
import { WaiverStatusBadge } from "@/components/waivers/WaiverStatusBadge";

interface RosterMember {
  user_id: string;
  user_name: string;
  role: string;
  status: "pending_approval" | "approved";
  waiver_signed: boolean;
}

export function TeamDashboard({
  teamId,
  isCaptain,
  roster,
  inviteUrl,
}: {
  teamId: string;
  isCaptain: boolean;
  roster: RosterMember[];
  inviteUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleRosterAction = async (userId: string, action: "approve" | "remove") => {
    await fetch(`/api/teams/${teamId}/roster`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, userId, action }),
    });
  };

  const copyInvite = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(`${window.location.origin}${inviteUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="card p-6">
      {isCaptain && inviteUrl && (
        <div className="mb-6 p-4 bg-surface rounded-xl border border-gray-700">
          <p className="text-sm font-medium text-gray-300 mb-2">Share this invite link with teammates:</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-void p-2 rounded border border-gray-700 text-volt font-mono">{inviteUrl}</code>
            <button onClick={copyInvite} className="btn-secondary py-2 px-3 text-sm">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <h2 className="heading-sm text-white mb-4">Roster</h2>
      <div className="divide-y divide-gray-800">
        {roster.map((member) => (
          <div key={member.user_id} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-white">
                {member.user_name} {member.role === "captain" && <span className="text-volt">👑</span>}
              </p>
              <p className="text-xs text-gray-500">
                {member.status === "approved" ? (
                  <span className="text-volt">✓ Approved</span>
                ) : (
                  <span className="text-hyper">⏳ Pending</span>
                )}
                <WaiverStatusBadge signed={member.waiver_signed} />
              </p>
            </div>
            {isCaptain && member.role !== "captain" && (
              <div className="flex gap-2">
                {member.status === "pending_approval" && member.waiver_signed && (
                  <button
                    onClick={() => handleRosterAction(member.user_id, "approve")}
                    className="btn-primary py-1 px-3 text-xs"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => handleRosterAction(member.user_id, "remove")}
                  className="btn-ghost py-1 px-3 text-xs text-hyper hover:bg-hyper/10"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
