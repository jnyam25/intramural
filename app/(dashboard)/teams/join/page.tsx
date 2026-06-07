"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";

function JoinTeamForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    setError(null);

    const res = await fetch("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();

    if (res.ok) {
      router.push(`/teams/${data.teamId}`);
    } else {
      setError(data.error ?? "Something went wrong.");
      setJoining(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <h1 className="text-xl font-bold text-red-900 mb-2">Invalid Invite Link</h1>
          <p className="text-sm text-red-700">This invite link is missing a token. Ask your captain to share the link again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-24">
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;ve been invited!</h1>
        <p className="text-gray-500 text-sm mb-8">
          Accept this invite to join the team roster. Your captain will need to approve you before you are eligible to play.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {joining ? "Joining..." : "Accept Invite & Join Team"}
        </button>

        <p className="mt-4 text-xs text-gray-400">
          You must sign the league waiver before your captain can approve your roster spot.
        </p>
      </div>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense>
      <JoinTeamForm />
    </Suspense>
  );
}
