"use client";
import { useState } from "react";

const ROLES = [
  "sports_admin",
  "league_admin",
  "coach",
  "referee",
  "captain",
  "participant",
];

export function RoleGrantForm({ schoolSlug }: { schoolSlug: string }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("participant");
  const [leagueId, setLeagueId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/admin/roles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        role,
        scope: leagueId ? { league_id: leagueId } : undefined,
      }),
    });
    const data = await res.json();
    setResult({ message: data.message ?? data.error, success: res.ok });
    if (res.ok) {
      setUserId("");
      setLeagueId("");
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Grant Role</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            placeholder="MongoDB ObjectId"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            League ID <span className="text-gray-400 font-normal">(optional scope)</span>
          </label>
          <input
            type="text"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            placeholder="Leave blank for school-wide"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {result && (
          <div
            className={`p-3 rounded text-sm ${
              result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Granting..." : "Grant Role"}
        </button>
      </form>
    </div>
  );
}
