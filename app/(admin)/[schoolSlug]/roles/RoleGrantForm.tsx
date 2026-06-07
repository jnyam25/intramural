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

export function RoleGrantForm({
  assignments,
}: {
  schoolSlug: string;
  assignments: Array<{ id: string; role: string; userId: string }>;
}) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("participant");
  const [leagueId, setLeagueId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);

  const handleGrant = async (e: React.FormEvent) => {
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

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/admin/roles`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId }),
    });
    const data = await res.json();
    setResult({ message: data.message ?? data.error, success: res.ok });
    if (res.ok) setAssignmentId("");
    setSubmitting(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-6">
        <h2 className="heading-sm text-white mb-4">Grant Role</h2>
        <form onSubmit={handleGrant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              placeholder="MongoDB ObjectId"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              League ID <span className="text-gray-500 font-normal">(optional scope)</span>
            </label>
            <input
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="Leave blank for school-wide"
              className="input"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? "Granting..." : "Grant Role"}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="heading-sm text-white mb-4">Revoke Role</h2>
        <form onSubmit={handleRevoke} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Active Assignment</label>
            <select
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              required
              className="input"
            >
              <option value="">Select assignment</option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.role.replace(/_/g, " ")} · {assignment.userId}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={submitting || !assignmentId} className="btn-secondary disabled:opacity-50">
            {submitting ? "Revoking..." : "Revoke Role"}
          </button>
        </form>
      </div>

      {result && (
        <div
          className={`lg:col-span-2 p-3 rounded-xl text-sm ${
            result.success ? "bg-volt/10 text-volt border border-volt/20" : "bg-hyper/10 text-hyper border border-hyper/20"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
