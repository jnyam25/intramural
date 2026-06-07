"use client";

import { useState } from "react";

interface RosterMember {
  id: string;
  name: string;
}

interface TeamOption {
  id: string;
  name: string;
  memberCount: number;
  roster: RosterMember[];
}

export function BroadcastForm({ teams }: { teams: TeamOption[] }) {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(teams.map((t) => t.id));
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Array<{ team: string; ok: boolean }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || selectedTeamIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const settled = await Promise.allSettled(
        selectedTeamIds.map((teamId) =>
          fetch(`/api/teams/${teamId}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: message }),
          }).then((r) => ({ team: teams.find((t) => t.id === teamId)?.name ?? teamId, ok: r.ok }))
        )
      );
      setResults(
        settled.map((r) =>
          r.status === "fulfilled" ? r.value : { team: "Unknown", ok: false }
        )
      );
      setMessage("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (teams.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-caption">You are not coaching any teams.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {results && (
        <div className="card p-4 space-y-2">
          <h3 className="text-sm font-medium text-white">Delivery Results</h3>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={r.ok ? "badge-success" : "badge-warning"}>{r.ok ? "Sent" : "Failed"}</span>
              <span className="text-sm text-gray-300">{r.team}</span>
            </div>
          ))}
          <button onClick={() => setResults(null)} className="btn-ghost text-sm mt-2">Send Another</button>
        </div>
      )}

      {!results && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300">Send to</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teams.map((team) => {
                const selected = selectedTeamIds.includes(team.id);
                return (
                  <button
                    type="button"
                    key={team.id}
                    onClick={() => toggleTeam(team.id)}
                    className={`card p-4 text-left transition-colors ${
                      selected ? "border-volt/60 bg-volt/5" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-white text-sm">{team.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{team.memberCount} members</p>
                      </div>
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        selected ? "bg-volt text-void" : "bg-surface border border-gray-700"
                      }`}>
                        {selected && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label htmlFor="broadcast-message" className="block text-sm font-medium text-gray-300">Message</label>
            <textarea
              id="broadcast-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={1000}
              required
              placeholder="Type your message to the team(s)…"
              className="input w-full resize-y"
            />
            <p className="text-xs text-gray-600 text-right">{message.length}/1000</p>
          </div>

          {error && <p className="text-sm text-hyper bg-hyper/10 rounded-lg px-4 py-2">{error}</p>}

          <button
            type="submit"
            disabled={submitting || selectedTeamIds.length === 0 || !message.trim()}
            className="btn-primary w-full"
          >
            {submitting
              ? "Sending…"
              : `Send to ${selectedTeamIds.length} team${selectedTeamIds.length !== 1 ? "s" : ""}`}
          </button>
        </form>
      )}
    </div>
  );
}
