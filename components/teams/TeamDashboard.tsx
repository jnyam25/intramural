"use client";

import { useState } from "react";

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
    <div className="bg-white rounded-lg shadow p-6">
      {isCaptain && inviteUrl && (
        <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm font-medium text-blue-900 mb-2">Share this invite link with teammates:</p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-white p-2 rounded border truncate">{inviteUrl}</code>
            <button onClick={copyInvite} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Roster</h2>
      <ul className="divide-y">
        {roster.map((member) => (
          <li key={member.user_id} className="py-3 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {member.user_name} {member.role === "captain" && "👑"}
              </p>
              <p className="text-xs text-gray-500">
                {member.status === "approved" ? "✅ Approved" : "⏳ Pending"}
                {!member.waiver_signed && " • ⚠️ Waiver missing"}
              </p>
            </div>
            {isCaptain && member.role !== "captain" && (
              <div className="flex gap-2">
                {member.status === "pending_approval" && member.waiver_signed && (
                  <button
                    onClick={() => handleRosterAction(member.user_id, "approve")}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded"
                  >
                    Approve
                  </button>
                )}
                <button
                  onClick={() => handleRosterAction(member.user_id, "remove")}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
