"use client";

import { useState } from "react";

export function ScoreSubmissionForm({
  matchId,
  myTeamRole,
}: {
  matchId: string;
  myTeamRole: "home" | "away";
}) {
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/matches/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, homeTeamScore: homeScore, awayTeamScore: awayScore }),
      });
      const data = await res.json();
      setResult({ message: data.message, success: res.ok });
    } catch {
      setResult({ message: "Submission failed", success: false });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-md">
      <h2 className="text-lg font-semibold mb-4">Submit Final Score</h2>
      <p className="text-xs text-gray-500 mb-4">
        ⚠️ Score submissions are immutable. Double-check with the opposing captain before submitting.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${myTeamRole === "home" ? "text-blue-700" : "text-gray-700"}`}>
            Home {myTeamRole === "home" && "(You)"}
          </label>
          <input
            type="number"
            min={0}
            value={homeScore}
            onChange={(e) => setHomeScore(Math.max(0, +e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${myTeamRole === "away" ? "text-blue-700" : "text-gray-700"}`}>
            Away {myTeamRole === "away" && "(You)"}
          </label>
          <input
            type="number"
            min={0}
            value={awayScore}
            onChange={(e) => setAwayScore(Math.max(0, +e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Score"}
      </button>

      {result && (
        <div className={`mt-4 p-3 rounded text-sm ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {result.message}
        </div>
      )}
    </form>
  );
}
