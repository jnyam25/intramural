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
    <form onSubmit={handleSubmit} className="card p-6 max-w-md">
      <h2 className="heading-sm text-white mb-4">Submit Final Score</h2>
      <p className="text-caption mb-4">
        Score submissions are immutable. Double-check with the opposing captain before submitting.
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="home-score" className={`block text-sm font-medium mb-1 ${myTeamRole === "home" ? "text-volt" : "text-gray-400"}`}>
            Home {myTeamRole === "home" && "(You)"}
          </label>
          <input
            id="home-score"
            type="number"
            min={0}
            value={homeScore}
            onChange={(e) => setHomeScore(Math.max(0, +e.target.value))}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="away-score" className={`block text-sm font-medium mb-1 ${myTeamRole === "away" ? "text-volt" : "text-gray-400"}`}>
            Away {myTeamRole === "away" && "(You)"}
          </label>
          <input
            id="away-score"
            type="number"
            min={0}
            value={awayScore}
            onChange={(e) => setAwayScore(Math.max(0, +e.target.value))}
            className="input"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Score"
        )}
      </button>

      {result && (
        <div className={`mt-4 p-3 rounded-xl text-sm ${result.success ? "bg-volt/10 text-volt border border-volt/20" : "bg-hyper/10 text-hyper border border-hyper/20"}`}>
          {result.message}
        </div>
      )}
    </form>
  );
}
