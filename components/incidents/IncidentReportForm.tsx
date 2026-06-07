"use client";

import { useState } from "react";

interface MatchOption {
  id: string;
  label: string;
}

export function IncidentReportForm({ matches }: { matches: MatchOption[] }) {
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [description, setDescription] = useState("");
  const [involvedUsers, setInvolvedUsers] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMatchId(matches[0]?.id ?? "");
    setSeverity("medium");
    setDescription("");
    setInvolvedUsers("");
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const involved_user_ids = involvedUsers
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length === 24);
      const res = await fetch(`/api/matches/${matchId}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ severity, description, involved_user_ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to submit report.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="card p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 mx-auto rounded-xl bg-volt/10 flex items-center justify-center text-volt text-xl">✓</div>
        <h2 className="heading-sm text-white">Report Submitted</h2>
        <p className="text-caption">Your incident report has been filed and will be reviewed by a league administrator.</p>
        <button onClick={reset} className="btn-secondary">File Another Report</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <label htmlFor="incident-match" className="block text-sm font-medium text-gray-300">Match</label>
        <select id="incident-match" value={matchId} onChange={(e) => setMatchId(e.target.value)} className="input w-full" required>
          {matches.length === 0 && <option value="">No matches available</option>}
          {matches.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="incident-severity" className="block text-sm font-medium text-gray-300">Severity</label>
        <select
          id="incident-severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as typeof severity)}
          className="input w-full"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="incident-description" className="block text-sm font-medium text-gray-300">
          Description <span className="text-gray-500 font-normal">(min. 10 characters)</span>
        </label>
        <textarea
          id="incident-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          minLength={10}
          maxLength={2000}
          required
          placeholder="Describe the incident in detail…"
          className="input w-full resize-y"
        />
        <p className="text-xs text-gray-600 text-right">{description.length}/2000</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="incident-involved" className="block text-sm font-medium text-gray-300">
          Involved User IDs <span className="text-gray-500 font-normal">(comma-separated, optional)</span>
        </label>
        <input
          id="incident-involved"
          type="text"
          value={involvedUsers}
          onChange={(e) => setInvolvedUsers(e.target.value)}
          placeholder="507f1f77bcf86cd799439011, …"
          className="input w-full font-mono text-sm"
        />
      </div>

      {error && <p className="text-sm text-hyper bg-hyper/10 rounded-lg px-4 py-2">{error}</p>}

      <button type="submit" disabled={submitting || matches.length === 0} className="btn-primary w-full">
        {submitting ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}
