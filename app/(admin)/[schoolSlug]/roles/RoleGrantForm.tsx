"use client";
import { useState } from "react";

const ASSIGNABLE_ROLES = [
  { value: "sports_admin",  label: "Sports Admin",  scopeType: "sport"  },
  { value: "league_admin",  label: "League Admin",  scopeType: "league" },
  { value: "coach",         label: "Coach",         scopeType: null     },
  { value: "referee",       label: "Referee",       scopeType: null     },
  { value: "captain",       label: "Captain",       scopeType: null     },
  { value: "participant",   label: "Participant",   scopeType: null     },
] as const;

type ScopeType = "sport" | "league" | null;

interface Props {
  schoolSlug: string;
  sports: Array<{ id: string; name: string }>;
  assignments: Array<{ id: string; role: string; userId: string }>;
}

export function RoleGrantForm({ sports, assignments }: Props) {
  const [userId,       setUserId]       = useState("");
  const [role,         setRole]         = useState<string>("participant");
  const [sportId,      setSportId]      = useState("");
  const [leagueId,     setLeagueId]     = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [result,       setResult]       = useState<{ message: string; success: boolean } | null>(null);

  const activeScopeType: ScopeType =
    (ASSIGNABLE_ROLES.find((r) => r.value === role)?.scopeType as ScopeType) ?? null;

  const buildScope = () => {
    if (activeScopeType === "sport"  && sportId)  return { sport_id: sportId };
    if (activeScopeType === "league" && leagueId) return { league_id: leagueId };
    return undefined;
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeScopeType === "sport" && !sportId) {
      setResult({ message: "Please select a sport for Sports Admin.", success: false });
      return;
    }
    setSubmitting(true);
    setResult(null);

    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role, scope: buildScope() }),
    });
    const data = await res.json();
    setResult({ message: data.message ?? data.error, success: res.ok });
    if (res.ok) {
      setUserId("");
      setSportId("");
      setLeagueId("");
    }
    setSubmitting(false);
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch("/api/admin/roles", {
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
      {/* ---- Grant ---- */}
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
            <label htmlFor="grant-role" className="block text-sm font-medium text-gray-300 mb-1">
              Role
            </label>
            <select
              id="grant-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setSportId("");
                setLeagueId("");
              }}
              className="input"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sport scope — Sports Admin only */}
          {activeScopeType === "sport" && (
            <div>
              <label htmlFor="grant-sport" className="block text-sm font-medium text-gray-300 mb-1">
                Sport <span className="text-hyper">*</span>
              </label>
              {sports.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No sports found. Run <span className="font-mono">POST /api/seed</span> to create test data.
                </p>
              ) : (
                <select
                  id="grant-sport"
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Select a sport…</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Sports Admin has full authority over all leagues within this sport.
              </p>
            </div>
          )}

          {/* League scope — League Admin only */}
          {activeScopeType === "league" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                League ID{" "}
                <span className="text-gray-500 font-normal">(leave blank for school-wide)</span>
              </label>
              <input
                type="text"
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                placeholder="MongoDB ObjectId or leave blank"
                className="input"
              />
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? "Granting…" : "Grant Role"}
          </button>
        </form>
      </div>

      {/* ---- Revoke ---- */}
      <div className="card p-6">
        <h2 className="heading-sm text-white mb-4">Revoke Role</h2>
        <form onSubmit={handleRevoke} className="space-y-4">
          <div>
            <label htmlFor="revoke-assignment" className="block text-sm font-medium text-gray-300 mb-1">
              Active Assignment
            </label>
            <select
              id="revoke-assignment"
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              required
              className="input"
            >
              <option value="">Select assignment…</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.role.replace(/_/g, " ")} · {a.userId}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting || !assignmentId}
            className="btn-secondary disabled:opacity-50"
          >
            {submitting ? "Revoking…" : "Revoke Role"}
          </button>
        </form>
      </div>

      {result && (
        <div
          className={`lg:col-span-2 p-3 rounded-xl text-sm ${
            result.success
              ? "bg-volt/10 text-volt border border-volt/20"
              : "bg-hyper/10 text-hyper border border-hyper/20"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
