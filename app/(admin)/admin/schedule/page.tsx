"use client";

import { useState, useEffect } from "react";

interface League {
  id: string;
  name: string;
  sport: string;
  status: string;
}

interface GeneratedMatch {
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  round: number;
  scheduled_at: string;
}

interface GeneratedSchedule {
  id: string;
  status: string;
  matches: GeneratedMatch[];
  total_matches: number;
  total_rounds: number;
}

export default function SchedulePage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch leagues
    fetch("/api/leagues?status=registration,active")
      .then((res) => res.json())
      .then((data) => setLeagues(data.leagues || []));

    // Default start date to next Monday
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    setStartDate(nextMonday.toISOString().split("T")[0]);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSchedule(null);

    try {
      const res = await fetch("/api/admin/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: selectedLeague,
          startDate,
          matchDurationMinutes: 90,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate schedule");
      }

      setSchedule(data.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!schedule) return;
    
    try {
      const res = await fetch("/api/admin/schedule/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId: schedule.id }),
      });

      if (res.ok) {
        setSchedule({ ...schedule, status: "published" });
      }
    } catch (err) {
      console.error("Failed to publish:", err);
    }
  };

  // Group matches by round
  const matchesByRound = schedule?.matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, GeneratedMatch[]>);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="heading-md text-white">Auto-Schedule Generator</h1>
        <p className="text-body mt-1">
          Generate round-robin schedules with manual review before publishing
        </p>
      </div>

      {/* Generate Form */}
      <div className="card p-6">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Select League</label>
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="input"
                required
              >
                <option value="">Choose a league...</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name} ({league.sport})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-hyper/10 border border-hyper/20 rounded-xl text-sm text-hyper">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedLeague}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Schedule"
            )}
          </button>
        </form>
      </div>

      {/* Generated Schedule */}
      {schedule && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="heading-sm text-white">Draft Schedule</h2>
              <p className="text-caption">
                {schedule.total_matches} matches across {schedule.total_rounds} rounds
              </p>
            </div>
            <div className="flex items-center gap-2">
              {schedule.status === "draft" ? (
                <>
                  <span className="badge-info">Draft</span>
                  <button
                    onClick={handlePublish}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    Publish Schedule
                  </button>
                </>
              ) : (
                <span className="badge-success">Published</span>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-800 max-h-96 overflow-y-auto">
            {matchesByRound &&
              Object.entries(matchesByRound).map(([round, matches]) => (
                <div key={round} className="p-4">
                  <h3 className="text-sm font-medium text-cyber mb-3">
                    Round {round}
                  </h3>
                  <div className="space-y-2">
                    {matches.map((match, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface border border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {new Date(match.scheduled_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="font-medium text-white">
                            {match.home_team_name}
                          </span>
                          <span className="text-gray-500">vs</span>
                          <span className="font-medium text-white">
                            {match.away_team_name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(match.scheduled_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card p-6 border border-gray-700">
        <h3 className="font-display font-semibold text-white mb-4">About the Scheduler</h3>
        <ul className="space-y-2 text-body text-sm">
          <li>• Uses round-robin algorithm for fair match distribution</li>
          <li>• Generates draft schedules for admin review before publishing</li>
          <li>• Assumes 90-minute matches with 30-minute buffer time</li>
          <li>• Future enhancement: Constraint-based scheduling (facility conflicts, etc.)</li>
        </ul>
      </div>
    </div>
  );
}
