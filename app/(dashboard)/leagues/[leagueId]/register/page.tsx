"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function LeagueRegistrationPage() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.leagueId as string;
  
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTeam, setCreatedTeam] = useState<{ id: string; name: string; inviteCode: string } | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, leagueId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      setCreatedTeam(data.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // First lookup team by invite code
      const lookupRes = await fetch(`/api/teams?inviteCode=${inviteCode.toUpperCase()}`);
      const lookupData = await lookupRes.json();

      if (!lookupRes.ok || !lookupData.team) {
        throw new Error("Invalid invite code");
      }

      const teamId = lookupData.team.id;

      // Join the team
      const res = await fetch(`/api/teams/${teamId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join team");
      }

      // Redirect to team page
      router.push(`/teams/${teamId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="heading-md text-white">Join the League</h1>
        <p className="text-body">Create a new team or join an existing one</p>
      </div>

      {/* Mode Selection */}
      {!mode && !createdTeam && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setMode("create")}
            className="card p-8 text-center hover:border-volt transition-all group"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-volt/10 flex items-center justify-center text-volt group-hover:bg-volt/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </div>
            <h3 className="font-display font-semibold text-white text-lg mb-2">Create Team</h3>
            <p className="text-caption">Start a new team and invite players</p>
          </button>

          <button
            onClick={() => setMode("join")}
            className="card p-8 text-center hover:border-cyber transition-all group"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-cyber/10 flex items-center justify-center text-cyber group-hover:bg-cyber/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            </div>
            <h3 className="font-display font-semibold text-white text-lg mb-2">Join Team</h3>
            <p className="text-caption">Enter an invite code to join</p>
          </button>
        </div>
      )}

      {/* Create Team Form */}
      {mode === "create" && !createdTeam && (
        <div className="card p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setMode(null)}
              className="btn-ghost p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="heading-sm text-white">Create Your Team</h2>
          </div>

          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Thunderbolts"
                className="input"
                required
                minLength={3}
                maxLength={50}
              />
            </div>

            {error && (
              <div className="p-3 bg-hyper/10 border border-hyper/20 rounded-xl text-sm text-hyper">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Team"
              )}
            </button>
          </form>
        </div>
      )}

      {/* Team Created Success */}
      {createdTeam && (
        <div className="card p-8 space-y-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-volt/10 flex items-center justify-center text-volt">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          
          <div>
            <h2 className="heading-sm text-white mb-2">Team Created!</h2>
            <p className="text-body">
              Your team <span className="text-volt font-semibold">{createdTeam.name}</span> is ready
            </p>
          </div>

          <div className="bg-surface rounded-xl p-4 space-y-2">
            <p className="text-caption">Share this invite code with your teammates:</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-3xl font-mono font-bold text-volt tracking-wider">
                {createdTeam.inviteCode}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(createdTeam.inviteCode)}
                className="btn-ghost p-2"
                title="Copy to clipboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
          </div>

          <Link
            href={`/teams/${createdTeam.id}`}
            className="btn-primary w-full"
          >
            Go to Team Dashboard
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>
      )}

      {/* Join Team Form */}
      {mode === "join" && (
        <div className="card p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setMode(null)}
              className="btn-ghost p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="heading-sm text-white">Join a Team</h2>
          </div>

          <form onSubmit={handleJoinTeam} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="input font-mono text-center text-lg tracking-wider"
                required
                maxLength={8}
              />
              <p className="text-xs text-gray-500">
                Enter the 8-character code from your team captain
              </p>
            </div>

            {error && (
              <div className="p-3 bg-hyper/10 border border-hyper/20 rounded-xl text-sm text-hyper">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || inviteCode.length < 8}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                  Joining...
                </>
              ) : (
                "Request to Join"
              )}
            </button>
          </form>
        </div>
      )}

      {/* Back Link */}
      <div className="text-center">
        <Link
          href={`/leagues/${leagueId}`}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back to League Details
        </Link>
      </div>
    </div>
  );
}
