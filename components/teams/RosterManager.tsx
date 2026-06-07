"use client";

import { useState } from "react";

interface RosterMember {
  user_id: string;
  status: "pending" | "approved" | "rejected";
  role: "captain" | "player";
  joined_at: string;
  is_active: boolean;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    image?: string;
  } | null;
}

interface RosterManagerProps {
  teamId: string;
  isCaptain: boolean;
  roster: RosterMember[];
}

export function RosterManager({ teamId, isCaptain, roster }: RosterManagerProps) {
  const [members, setMembers] = useState(roster);
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setLoading(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "approve" }),
      });

      if (res.ok) {
        setMembers(members.map(m => 
          m.user_id === userId ? { ...m, status: "approved" } : m
        ));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDeny = async (userId: string) => {
    setLoading(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "deny" }),
      });

      if (res.ok) {
        setMembers(members.filter(m => m.user_id !== userId));
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Remove this player from the team?")) return;
    
    setLoading(userId);
    try {
      const res = await fetch(`/api/teams/${teamId}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "remove" }),
      });

      if (res.ok) {
        setMembers(members.filter(m => m.user_id !== userId));
      }
    } finally {
      setLoading(null);
    }
  };

  const pendingMembers = members.filter(m => m.status === "pending");
  const approvedMembers = members.filter(m => m.status === "approved");

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="heading-sm text-white">Team Roster</h2>
        <div className="flex items-center gap-2">
          <span className="text-caption">
            {approvedMembers.length} / ? players
          </span>
          {pendingMembers.length > 0 && (
            <span className="badge-warning">
              {pendingMembers.length} pending
            </span>
          )}
        </div>
      </div>

      {/* Pending Requests (Captain Only) */}
      {isCaptain && pendingMembers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-hyper mb-3">Pending Requests</h3>
          <div className="space-y-2">
            {pendingMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 rounded-xl bg-hyper/5 border border-hyper/20"
              >
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    {member.user?.first_name?.[0]}
                    {member.user?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {member.user?.first_name} {member.user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeny(member.user_id)}
                    disabled={loading === member.user_id}
                    className="btn-ghost text-sm text-gray-400 hover:text-hyper"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => handleApprove(member.user_id)}
                    disabled={loading === member.user_id}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {loading === member.user_id ? "..." : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Members */}
      <div className="space-y-2">
        {approvedMembers.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center justify-between p-3 rounded-xl bg-surface border border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className="avatar">
                {member.user?.first_name?.[0]}
                {member.user?.last_name?.[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">
                    {member.user?.first_name} {member.user?.last_name}
                  </p>
                  {member.role === "captain" && (
                    <span className="badge-success text-xs py-0.5 px-2">Captain</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{member.user?.email}</p>
              </div>
            </div>
            {isCaptain && member.role !== "captain" && (
              <button
                onClick={() => handleRemove(member.user_id)}
                disabled={loading === member.user_id}
                className="btn-ghost p-2 text-gray-400 hover:text-hyper"
                title="Remove from team"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {approvedMembers.length === 0 && pendingMembers.length === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-surface flex items-center justify-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <p className="text-caption">No team members yet</p>
          {isCaptain && (
            <p className="text-xs text-gray-500 mt-1">
              Share your invite code to add players
            </p>
          )}
        </div>
      )}
    </div>
  );
}
