"use client";

import { useState } from "react";

interface EligibilityResult {
  eligible: boolean;
  status: string;
  enrollment_date: string;
  academic_standing: string;
  verified_at: string;
  source: string;
  cache_ttl_seconds: number;
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export default function EligibilityPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/admin/eligibility/${userId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to check eligibility");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="heading-md text-white">Eligibility Verification</h1>
        <p className="text-body mt-1">
          Verify student enrollment status via SIS integration (mock)
        </p>
      </div>

      {/* Search */}
      <div className="card p-6">
        <form onSubmit={handleCheck} className="flex gap-4">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User ID"
            className="input flex-1"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                Checking...
              </>
            ) : (
              "Verify"
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-hyper/10 border border-hyper/20 rounded-xl text-sm text-hyper">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                result.eligible
                  ? "bg-volt/10 text-volt"
                  : "bg-hyper/10 text-hyper"
              }`}
            >
              {result.eligible ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              )}
            </div>
            <div>
              <h2
                className={`heading-sm ${
                  result.eligible ? "text-volt" : "text-hyper"
                }`}
              >
                {result.eligible ? "Eligible" : "Not Eligible"}
              </h2>
              <p className="text-caption">
                Status: <span className="text-gray-300 capitalize">{result.status}</span>
              </p>
            </div>
          </div>

          {result.user && (
            <div className="mb-6 p-4 bg-surface rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Student</p>
              <p className="font-medium text-white">
                {result.user.first_name} {result.user.last_name}
              </p>
              <p className="text-sm text-gray-500">{result.user.email}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-xl">
              <p className="text-caption mb-1">Enrollment Date</p>
              <p className="text-white">{result.enrollment_date}</p>
            </div>
            <div className="p-4 bg-surface rounded-xl">
              <p className="text-caption mb-1">Academic Standing</p>
              <p className="text-white capitalize">{result.academic_standing}</p>
            </div>
            <div className="p-4 bg-surface rounded-xl">
              <p className="text-caption mb-1">Verified At</p>
              <p className="text-white">
                {new Date(result.verified_at).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-surface rounded-xl">
              <p className="text-caption mb-1">Source</p>
              <p className="text-white">{result.source}</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-surface rounded-xl text-center">
            <p className="text-xs text-gray-500">
              Cache expires in {Math.floor(result.cache_ttl_seconds / 3600)} hours
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card p-6 border border-gray-700">
        <h3 className="font-display font-semibold text-white mb-4">About Eligibility Verification</h3>
        <ul className="space-y-2 text-body text-sm">
          <li>• This is a mock SIS integration for demo purposes</li>
          <li>• In production, this would connect to your Student Information System</li>
          <li>• Results are cached for 24 hours to reduce API load</li>
          <li>• FERPA compliance: All lookups are logged for audit purposes</li>
        </ul>
      </div>
    </div>
  );
}
